package com.lastcall.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.LinkedHashSet;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.lastcall.dao.EmergencyDao;
import com.lastcall.dto.EmergencyDto;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class EmergencyService {
	
	private final EmergencyDao emergencyDao;
	private final RestTemplate restTemplate;
	private final Map<String, DepartmentCacheEntry> departmentCache = new ConcurrentHashMap<>();
	private final Map<String, ApiResponseCacheEntry> apiResponseCache = new ConcurrentHashMap<>();
	private final Map<String, Object> apiRequestLocks = new ConcurrentHashMap<>();
	private final Map<String, CompletableFuture<Void>> warmupTasks = new ConcurrentHashMap<>();
	private volatile CompletableFuture<Void> searchWarmupTask;
	private static final long DEPARTMENT_CACHE_MILLIS = 6 * 60 * 60 * 1000L;
	private static final long REALTIME_CACHE_MILLIS = 15 * 1000L;
	private static final long HOSPITAL_INFO_CACHE_MILLIS = 6 * 60 * 60 * 1000L;
	private static final long SEVERE_CACHE_MILLIS = 60 * 1000L;
	private static final List<String> PROVINCES = List.of(
			"서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시",
			"세종특별자치시", "경기도", "강원특별자치도", "충청북도", "충청남도", "전북특별자치도", "전라남도",
			"경상북도", "경상남도", "제주특별자치도");
	
	@Value("${emergency.api.service-key}")
	private String serviceKey;
	
	public List<EmergencyDto> getEmergencyList() {
		return emergencyDao.getEmergencyList();
	}
	
	// api 연결 테스트 
	public String getEmergencyApiTest() {

	    String url = UriComponentsBuilder
	            .fromUriString("http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire")
	            .queryParam("serviceKey", serviceKey)
	            .queryParam("STAGE1", "대전광역시")
	            .queryParam("STAGE2", "중구")
	            .queryParam("pageNo", "1")
	            .queryParam("numOfRows", "100")
	            .build(false)
	            .toUriString();

	    System.out.println("공공 API 요청 URL = " + url);

	    return restTemplate.getForObject(url, String.class);
	}
	
	public List<EmergencyDto> getEmergencyApiList(String stage1, String stage2) {
		return getEmergencyApiList(stage1, stage2, true);
	}

	public void warmupRegion(String stage1) {
		if (stage1 == null || stage1.isBlank()) return;
		String region = stage1.trim();
		warmupTasks.computeIfAbsent(region, key -> {
			CompletableFuture<Void> task = CompletableFuture.runAsync(() -> {
				try {
					getEmergencyApiList(key, null, true);
				} catch (Exception error) {
					System.err.println("지역 사전 캐시 실패, 일반 검색으로 계속 진행: " + key);
				}
			});
			task.whenComplete((ignored, error) -> warmupTasks.remove(key, task));
			return task;
		});
	}

	public synchronized void warmupSearchIndex() {
		if (searchWarmupTask != null && !searchWarmupTask.isDone()) return;
		searchWarmupTask = CompletableFuture.runAsync(() -> PROVINCES.parallelStream().forEach(province -> {
			try {
				getHospitalInfoList(province, null);
			} catch (RuntimeException error) {
				System.err.println("전국 병원 검색 색인 사전 조회 실패: " + province);
			}
		}));
	}

	private List<EmergencyDto> getEmergencyApiList(String stage1, String stage2, boolean includeDepartments) {
		CompletableFuture<List<EmergencyDto>> bedsFuture = CompletableFuture.supplyAsync(
				() -> getEmergencyBedList(stage1, stage2));
		CompletableFuture<List<EmergencyDto>> infoFuture = CompletableFuture.supplyAsync(
				() -> getHospitalInfoList(stage1, stage2));

		List<EmergencyDto> bedList = bedsFuture.join();
		Map<String, EmergencyDto> infoByHpid = new HashMap<>();
		infoFuture.join().forEach(info -> infoByHpid.put(info.getHpid(), info));

		bedList.forEach(bed -> {
			EmergencyDto info = infoByHpid.get(bed.getHpid());
			if (info != null) {
				bed.setAddress(info.getAddress());
				bed.setPhone(info.getPhone());
				bed.setLatitude(info.getLatitude());
				bed.setLongitude(info.getLongitude());
			}
		});

		if (includeDepartments) {
			bedList.parallelStream().forEach(dto -> dto.setDepartments(getCachedDepartmentInfo(dto.getHpid())));
		}
		return bedList;
	}
	// gps 기준 가까운 병원 거리 출력
	public List<EmergencyDto> getNearbyEmergencyList(String stage1, String stage2, double lat, double lon, String symptom, String keyword,
			String sort, String department, String bedTypes, String facilities, String severeTypes, boolean includeDetails){
		boolean needsDepartments = (symptom != null && !symptom.isBlank())
				|| (department != null && !department.isBlank() && !"전체".equals(department));
		List<EmergencyDto> list = getEmergencyApiList(stage1, stage2, needsDepartments);
		List<DepartmentScore> departmentScores = getDepartmentScoresBySymptom(symptom);
		List<String> requestedSevereTypes = splitFilter(severeTypes);
		if (includeDetails || !requestedSevereTypes.isEmpty()) {
			Map<String, List<String>> severeByHospital = getSevereCapabilities(stage1, stage2);
			list.forEach(dto -> dto.setSevereCapabilities(severeByHospital.getOrDefault(dto.getHpid(), List.of())));
		}
		
		for(EmergencyDto dto : list) {
			double distance = calculateDistance(
					lat,
					lon,
					dto.getLatitude(),
					dto.getLongitude()
			);
			dto.setDistance(distance);
			
			 int recommendScore = calculateRecommendScore(
		                dto.getDepartments(),
		                departmentScores
		        );

		        dto.setRecommendScore(recommendScore);
		        
		        String matchedDepartments = getMatchedDepartments(
		                dto.getDepartments(),
		                departmentScores
		        );

		        dto.setMatchedDepartments(matchedDepartments);
		    }
		List<String> requestedBeds = splitFilter(bedTypes);
		List<String> requestedFacilities = splitFilter(facilities);
		list.removeIf(dto -> !matchesKeyword(dto, keyword)
				|| !matchesDepartment(dto, department)
				|| !requestedBeds.stream().allMatch(type -> hasAvailableBed(dto, type))
				|| !requestedFacilities.stream().allMatch(type -> hasFacility(dto, type))
				|| !dto.getSevereCapabilities().containsAll(requestedSevereTypes));

		sortEmergencyList(list, symptom, sort);

		return list;
	}

	/** 병원명/주소 직접 검색은 현재 위치의 시·도와 무관하게 전국을 대상으로 한다. */
	public List<EmergencyDto> searchEmergencyList(double lat, double lon, String symptom, String keyword,
			String sort, String department, String bedTypes, String facilities, String severeTypes, boolean includeDetails) {
		if (keyword == null || keyword.isBlank()) return List.of();

		Set<String> matchedProvinces = PROVINCES.parallelStream()
				.filter(province -> {
					try {
						return getHospitalInfoList(province, null).stream().anyMatch(dto -> matchesKeyword(dto, keyword));
					} catch (RuntimeException error) {
						System.err.println("전국 병원 색인 조회 실패: " + province);
						return false;
					}
				})
				.collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

		List<EmergencyDto> results = matchedProvinces.parallelStream()
				.flatMap(province -> {
					try {
						return getNearbyEmergencyList(province, null, lat, lon, symptom, keyword, sort,
								department, bedTypes, facilities, severeTypes, includeDetails).stream();
					} catch (RuntimeException error) {
						System.err.println("전국 병원 실시간 정보 조회 실패: " + province);
						return java.util.stream.Stream.empty();
					}
				})
				.collect(java.util.stream.Collectors.toCollection(ArrayList::new));

		Map<String, EmergencyDto> unique = new java.util.LinkedHashMap<>();
		results.forEach(dto -> unique.putIfAbsent(dto.getHpid(), dto));
		List<EmergencyDto> uniqueResults = new ArrayList<>(unique.values());
		sortEmergencyList(uniqueResults, symptom, sort);
		uniqueResults.sort(Comparator.comparingInt(dto -> keywordMatchScore(dto, keyword)));
		return uniqueResults;
	}

	private void sortEmergencyList(List<EmergencyDto> list, String symptom, String sort) {
		Comparator<EmergencyDto> comparator = switch (sort == null ? "distance" : sort) {
			case "emergencyBeds" -> Comparator.comparingInt(EmergencyDto::getAvailableBeds).reversed()
					.thenComparingDouble(EmergencyDto::getDistance);
			case "icuBeds" -> Comparator.comparingInt(this::totalIcuBeds).reversed()
					.thenComparingDouble(EmergencyDto::getDistance);
			case "operatingRooms" -> Comparator.comparingInt(EmergencyDto::getOperatingRooms).reversed()
					.thenComparingDouble(EmergencyDto::getDistance);
			default -> Comparator.comparingDouble(EmergencyDto::getDistance);
		};
		if (symptom != null && !symptom.isBlank()) {
			comparator = Comparator.comparingInt(EmergencyDto::getRecommendScore).reversed().thenComparing(comparator);
		}
		list.sort(comparator);
	}
	// 병상 정보
	private List<EmergencyDto> getEmergencyBedList(String stage1, String stage2) {

		UriComponentsBuilder builder = UriComponentsBuilder
		        .fromUriString("http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire")
		        .queryParam("serviceKey", serviceKey)
		        .queryParam("STAGE1", stage1)
		        .queryParam("pageNo", 1)
		        .queryParam("numOfRows", 100)
		        .queryParam("_type", "json");

		if(stage2 != null && !stage2.isBlank()) {
		    builder.queryParam("STAGE2", stage2);
		}

		String url = builder
		        .build(false)
		        .toUriString();
		String response = getCachedApiResponse(url, REALTIME_CACHE_MILLIS);
		
	    return parseEmergencyApiResponse(response);
	}
	
	private List<EmergencyDto> parseEmergencyApiResponse(String response) {
		
		List<EmergencyDto> list = new ArrayList<>();
		
		try {
			ObjectMapper objectMapper = new ObjectMapper();
			JsonNode root = objectMapper.readTree(response);
			
			JsonNode itemNode = root
					.path("response")
					.path("body")
					.path("items")
					.path("item");
			
			if(itemNode.isMissingNode() || itemNode.isNull()) {
				return list;
			}
			
			if(itemNode.isArray()) {
				for(JsonNode item : itemNode) {
					list.add(toDto(item));
				}
			} else {
				list.add(toDto(itemNode));
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		
		return list;
	}
	
	private EmergencyDto toDto(JsonNode item) {
		
		EmergencyDto dto = new EmergencyDto();
		
		dto.setHpid(item.path("hpid").asText(""));
	    dto.setHospitalName(item.path("dutyName").asText(""));
	    dto.setEmergencyPhone(item.path("dutyTel3").asText(""));
	    dto.setDataUpdatedAt(item.path("hvidate").asText(""));
	    dto.setDutyDoctor(item.path("hvdnm").asText(""));
	    dto.setDutyDoctorPhone(item.path("hv1").asText(""));
	    dto.setAvailableBeds(item.path("hvec").asInt(0));
	    dto.setOperatingRooms(item.path("hvoc").asInt(0));
	    dto.setNeuroIcuBeds(item.path("hvcc").asInt(0));
	    dto.setNeonatalIcuBeds(item.path("hvncc").asInt(0));
	    dto.setChestIcuBeds(item.path("hvccc").asInt(0));
	    dto.setGeneralIcuBeds(item.path("hvicc").asInt(0));
	    dto.setInpatientBeds(item.path("hvgc").asInt(0));
	    dto.setCtAvailable(isAvailable(item.path("hvctayn").asText("")));
	    dto.setMriAvailable(isAvailable(item.path("hvmriayn").asText("")));
	    dto.setAngiographyAvailable(isAvailable(item.path("hvangioayn").asText("")));
	    dto.setVentilatorAvailable(isAvailable(item.path("hvventiayn").asText("")));
	    dto.setAmbulanceAvailable(isAvailable(item.path("hvamyn").asText("")));
	    dto.setPediatricVentilatorAvailable(isAvailable(item.path("hv10").asText("")));
	    dto.setIncubatorAvailable(isAvailable(item.path("hv11").asText("")));

	    return dto;
	}
	// 병원 정보
	private List<EmergencyDto> getHospitalInfoList(String stage1, String stage2) {

		UriComponentsBuilder builder = UriComponentsBuilder
		        .fromUriString("http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytListInfoInqire")
		        .queryParam("serviceKey", serviceKey)
		        .queryParam("Q0", stage1)
		        .queryParam("pageNo", 1)
		        .queryParam("numOfRows", 100)
		        .queryParam("_type", "json");

		if(stage2 != null && !stage2.isBlank()) {
		    builder.queryParam("Q1", stage2);
		}

		String url = builder
		        .build(false)
		        .toUriString();

	    String response = getCachedApiResponse(url, HOSPITAL_INFO_CACHE_MILLIS);

	    return parseHospitalInfoResponse(response);
	}
	
	private List<EmergencyDto> parseHospitalInfoResponse(String response) {
		List<EmergencyDto> list = new ArrayList<>();
		
		try {
			ObjectMapper objectMapper = new ObjectMapper();
			JsonNode root = objectMapper.readTree(response);
			
			JsonNode itemNode = root.path("response")
					.path("body")
					.path("items")
					.path("item");
			
			if(itemNode.isMissingNode() || itemNode.isNull()) {
				return list;
			}
			
			if(itemNode.isArray()) {
				for(JsonNode item : itemNode) {
					list.add(toHospitalInfoDto(item));
				}
			} else {
				list.add(toHospitalInfoDto(itemNode));
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return list;
	}
	
	private EmergencyDto toHospitalInfoDto(JsonNode item) {
		EmergencyDto dto = new EmergencyDto();
		
	    dto.setHpid(item.path("hpid").asText(""));
	    dto.setHospitalName(item.path("dutyName").asText(""));
	    dto.setAddress(item.path("dutyAddr").asText(""));
	    dto.setPhone(item.path("dutyTel1").asText(""));
	    dto.setLatitude(item.path("wgs84Lat").asDouble(0));
	    dto.setLongitude(item.path("wgs84Lon").asDouble(0));

	    return dto;
	}
	// 여기 공식은 검색하면 나옴 그냥 빼면 ㅈ됨
	private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
	    
		// 지구 반지름 키로미터 단위로 받은것임!
	    double earthRadius = 6371.0;
	    
	    double dLat = Math.toRadians(lat2 - lat1);
	    double dLon = Math.toRadians(lon2 - lon1);
	    
	    // 하버사인 공식 이거는 인터넷 참고하기
	    double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
	            + Math.cos(Math.toRadians(lat1))
	            * Math.cos(Math.toRadians(lat2))
	            * Math.sin(dLon / 2)
	            * Math.sin(dLon / 2);
	    // 중심각 계산 이것도 마찬가지임!
	    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	    
	    return Math.round((earthRadius * c) * 10) / 10.0;
	}
	// 진료과목 받아오기 테스트 api
	public String getHospitalBasicInfoTest(String hpid) {

	    String url = UriComponentsBuilder
	            .fromUriString("http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytBassInfoInqire")
	            .queryParam("serviceKey", serviceKey)
	            .queryParam("HPID", hpid)
	            .queryParam("_type", "json")
	            .build(false)
	            .toUriString();

	    System.out.println("응급의료기관 기본정보 요청 URL = " + url);

	    return restTemplate.getForObject(url, String.class);
	}
	// 진료 과목 받아오기
	private String getDepartmentInfo(String hpid) {

	    String url = UriComponentsBuilder
	            .fromUriString("http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytBassInfoInqire")
	            .queryParam("serviceKey", serviceKey)
	            .queryParam("HPID", hpid)
	            .queryParam("_type", "json")
	            .build(false)
	            .toUriString();

	    try {
	        String response = getCachedApiResponse(url, DEPARTMENT_CACHE_MILLIS);
	        ObjectMapper objectMapper = new ObjectMapper();
	        JsonNode root = objectMapper.readTree(response);

	        JsonNode item = root
	                .path("response")
	                .path("body")
	                .path("items")
	                .path("item");

	        return item.path("dgidIdName").asText("");

	    } catch (Exception e) {
	        System.err.println("진료과 정보 조회 실패, 병원별 정보 없이 계속 진행: " + hpid);
	    }

	    return "";
	}

	private String getCachedDepartmentInfo(String hpid) {
		long now = System.currentTimeMillis();
		DepartmentCacheEntry cached = departmentCache.get(hpid);
		if (cached != null && now - cached.createdAt() < DEPARTMENT_CACHE_MILLIS) {
			return cached.departments();
		}
		String departments = getDepartmentInfo(hpid);
		departmentCache.put(hpid, new DepartmentCacheEntry(departments, now));
		return departments;
	}

	private record DepartmentCacheEntry(String departments, long createdAt) {}

	private String getCachedApiResponse(String url, long ttlMillis) {
		long now = System.currentTimeMillis();
		ApiResponseCacheEntry cached = apiResponseCache.get(url);
		if (cached != null && now - cached.createdAt() < ttlMillis) return cached.body();
		Object requestLock = apiRequestLocks.computeIfAbsent(url, ignored -> new Object());
		synchronized (requestLock) {
			cached = apiResponseCache.get(url);
			if (cached != null && now - cached.createdAt() < ttlMillis) return cached.body();
			RuntimeException lastError = null;
			for (int attempt = 1; attempt <= 2; attempt++) {
				try {
					String body = restTemplate.getForObject(url, String.class);
					apiResponseCache.put(url, new ApiResponseCacheEntry(body, System.currentTimeMillis()));
					return body;
				} catch (RuntimeException error) {
					lastError = error;
				}
			}
			if (cached != null) {
				System.err.println("공공 API 재시도 실패, 이전 캐시 사용");
				return cached.body();
			}
			throw lastError;
		}
	}

	private record ApiResponseCacheEntry(String body, long createdAt) {}

	private Map<String, List<String>> getSevereCapabilities(String stage1, String stage2) {
		UriComponentsBuilder builder = UriComponentsBuilder
				.fromUriString("http://apis.data.go.kr/B552657/ErmctInfoInqireService/getSrsillDissAceptncPosblInfoInqire")
				.queryParam("serviceKey", serviceKey)
				.queryParam("STAGE1", stage1)
				.queryParam("pageNo", 1)
				.queryParam("numOfRows", 100)
				.queryParam("_type", "json");
		if (stage2 != null && !stage2.isBlank()) {
			builder.queryParam("STAGE2", stage2);
		}

		Map<String, List<String>> result = new HashMap<>();
		try {
			String response = getCachedApiResponse(builder.build(false).toUriString(), SEVERE_CACHE_MILLIS);
			JsonNode itemNode = new ObjectMapper().readTree(response)
					.path("response").path("body").path("items").path("item");
			if (itemNode.isArray()) {
				itemNode.forEach(item -> result.put(item.path("hpid").asText(""), parseSevereCapabilities(item)));
			} else if (!itemNode.isMissingNode() && !itemNode.isNull()) {
				result.put(itemNode.path("hpid").asText(""), parseSevereCapabilities(itemNode));
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		return result;
	}

	private List<String> parseSevereCapabilities(JsonNode item) {
		String[] keys = { "brainHemorrhage", "cerebralInfarction", "myocardialInfarction", "abdominalInjury",
				"limbReattachment", "emergencyEndoscopy", "emergencyDialysis", "prematureLabor",
				"mentalEmergency", "newborn", "severeBurn" };
		List<String> capabilities = new ArrayList<>();
		for (int index = 0; index < keys.length; index++) {
			String fieldNumber = String.valueOf(index + 1);
			String value = item.path("MKioskTy" + fieldNumber).asText("");
			if (value.isBlank()) value = item.path("mkioskTy" + fieldNumber).asText("");
			if (isAvailable(value)) capabilities.add(keys[index]);
		}
		return capabilities;
	}

	private boolean isAvailable(String value) {
		if (value == null) return false;
		String normalized = value.trim().toUpperCase();
		return normalized.equals("Y") || normalized.equals("가능") || normalized.startsWith("Y(");
	}

	private List<String> splitFilter(String value) {
		if (value == null || value.isBlank()) return List.of();
		return List.of(value.split(",")).stream().map(String::trim).filter(item -> !item.isBlank()).toList();
	}

	private boolean matchesDepartment(EmergencyDto dto, String department) {
		return department == null || department.isBlank() || "전체".equals(department)
				|| (dto.getDepartments() != null && dto.getDepartments().contains(department));
	}

	private boolean matchesKeyword(EmergencyDto dto, String keyword) {
		if (keyword == null || keyword.isBlank()) return true;
		String normalized = expandSearchQuery(normalizeSearchText(keyword));
		String hospitalName = normalizeSearchText(dto.getHospitalName());
		String address = normalizeSearchText(dto.getAddress());
		return hospitalName.contains(normalized) || address.contains(normalized)
				|| hasCloseWord(normalized, dto.getHospitalName()) || hasCloseWord(normalized, dto.getAddress());
	}

	private int keywordMatchScore(EmergencyDto dto, String keyword) {
		String query = expandSearchQuery(normalizeSearchText(keyword));
		String name = normalizeSearchText(dto.getHospitalName());
		String address = normalizeSearchText(dto.getAddress());
		if (name.equals(query)) return 0;
		if (name.contains(query)) return 1;
		if (address.contains(query)) return 2;
		return 3;
	}

	private String expandSearchQuery(String query) {
		return query.replace("대병원", "대학교병원");
	}

	private String normalizeSearchText(String value) {
		if (value == null) return "";
		return value.toLowerCase(java.util.Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]", "");
	}

	private boolean hasCloseWord(String query, String value) {
		if (query.length() < 3 || value == null) return false;
		for (String word : value.split("[\\s,()\\[\\]·-]+")) {
			String normalizedWord = normalizeSearchText(word);
			if (!normalizedWord.isEmpty() && levenshteinDistance(query, normalizedWord) <= Math.max(1, query.length() / 5)) return true;
		}
		return false;
	}

	private int levenshteinDistance(String left, String right) {
		int[] previous = new int[right.length() + 1];
		for (int index = 0; index <= right.length(); index++) previous[index] = index;
		for (int leftIndex = 1; leftIndex <= left.length(); leftIndex++) {
			int[] current = new int[right.length() + 1];
			current[0] = leftIndex;
			for (int rightIndex = 1; rightIndex <= right.length(); rightIndex++) {
				int cost = left.charAt(leftIndex - 1) == right.charAt(rightIndex - 1) ? 0 : 1;
				current[rightIndex] = Math.min(Math.min(current[rightIndex - 1] + 1, previous[rightIndex] + 1), previous[rightIndex - 1] + cost);
			}
			previous = current;
		}
		return previous[right.length()];
	}

	private boolean hasAvailableBed(EmergencyDto dto, String type) {
		return switch (type) {
			case "emergency" -> dto.getAvailableBeds() > 0;
			case "generalIcu" -> dto.getGeneralIcuBeds() > 0;
			case "neuroIcu" -> dto.getNeuroIcuBeds() > 0;
			case "neonatalIcu" -> dto.getNeonatalIcuBeds() > 0;
			case "chestIcu" -> dto.getChestIcuBeds() > 0;
			case "inpatient" -> dto.getInpatientBeds() > 0;
			case "operatingRoom" -> dto.getOperatingRooms() > 0;
			default -> true;
		};
	}

	private boolean hasFacility(EmergencyDto dto, String type) {
		return switch (type) {
			case "ct" -> dto.isCtAvailable();
			case "mri" -> dto.isMriAvailable();
			case "angiography" -> dto.isAngiographyAvailable();
			case "ventilator" -> dto.isVentilatorAvailable();
			case "pediatricVentilator" -> dto.isPediatricVentilatorAvailable();
			case "incubator" -> dto.isIncubatorAvailable();
			case "ambulance" -> dto.isAmbulanceAvailable();
			default -> true;
		};
	}

	private int totalIcuBeds(EmergencyDto dto) {
		return dto.getGeneralIcuBeds() + dto.getNeuroIcuBeds() + dto.getNeonatalIcuBeds() + dto.getChestIcuBeds();
	}
	
	// 점수제 
	private List<DepartmentScore> getDepartmentScoresBySymptom(String symptom) {

	    if (symptom == null || symptom.isBlank()) {
	        return List.of();
	    }

	    return switch (symptom) {
	        case "고열" -> List.of(
	                new DepartmentScore("소아청소년과", 100),
	                new DepartmentScore("내과", 70),
	                new DepartmentScore("응급의학과", 10)
	        );

	        case "가슴통증" -> List.of(
	                new DepartmentScore("심장내과", 100),
	                new DepartmentScore("순환기내과", 100),
	                new DepartmentScore("내과", 60),
	                new DepartmentScore("응급의학과", 10)
	        );

	        case "호흡곤란" -> List.of(
	                new DepartmentScore("호흡기내과", 100),
	                new DepartmentScore("내과", 60),
	                new DepartmentScore("응급의학과", 10)
	        );

	        case "복통" -> List.of(
	                new DepartmentScore("소화기내과", 100),
	                new DepartmentScore("외과", 70),
	                new DepartmentScore("내과", 60),
	                new DepartmentScore("응급의학과", 10)
	        );

	        case "외상" -> List.of(
	                new DepartmentScore("정형외과", 100),
	                new DepartmentScore("신경외과", 80),
	                new DepartmentScore("외과", 70),
	                new DepartmentScore("응급의학과", 10)
	        );

	        case "소아응급" -> List.of(
	                new DepartmentScore("소아청소년과", 120),
	                new DepartmentScore("응급의학과", 10)
	        );

	        default -> List.of();
	    };
	}
	// 점수 계산 메서드
	private int calculateRecommendScore(String departments, List<DepartmentScore> departmentScores) {

	    if (departments == null || departments.isBlank()) {
	        return 0;
	    }

	    if (departmentScores == null || departmentScores.isEmpty()) {
	        return 0;
	    }

	    int score = 0;

	    for (DepartmentScore departmentScore : departmentScores) {
	        if (departments.contains(departmentScore.getDepartment())) {
	            score += departmentScore.getScore();
	        }
	    }

	    return score;
	}
	// 이거는 점수 계산 x 조금 쓰임새가 다름
	private String getMatchedDepartments(String departments, List<DepartmentScore> departmentScores) {

	    if (departments == null || departments.isBlank()) {
	        return "";
	    }

	    if (departmentScores == null || departmentScores.isEmpty()) {
	        return "";
	    }

	    List<String> matchedList = new ArrayList<>();

	    for (DepartmentScore departmentScore : departmentScores) {
	        if (departments.contains(departmentScore.getDepartment())) {
	            matchedList.add(departmentScore.getDepartment());
	        }
	    }

	    return String.join(", ", matchedList);
	}
	
	// 점수제 dto 대체
	private static class DepartmentScore {
	    private final String department;
	    private final int score;

	    public DepartmentScore(String department, int score) {
	        this.department = department;
	        this.score = score;
	    }

	    public String getDepartment() {
	        return department;
	    }

	    public int getScore() {
	        return score;
	    }
	}
}
