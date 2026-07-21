package com.lastcall.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

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
	private final RestTemplate restTemplate = new RestTemplate();
	
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

	    RestTemplate restTemplate = new RestTemplate();

	    return restTemplate.getForObject(url, String.class);
	}
	
	public List<EmergencyDto> getEmergencyApiList(String stage1, String stage2) {
		
		List<EmergencyDto> bedList = getEmergencyBedList(stage1, stage2);
		
		List<EmergencyDto> hospitalInfoList = getHospitalInfoList(stage1, stage2);
	    
		for(EmergencyDto bedDto : bedList) {
			for(EmergencyDto infoDto : hospitalInfoList) {
				if(bedDto.getHpid().equals(infoDto.getHpid())) {
					bedDto.setAddress(infoDto.getAddress());
					bedDto.setPhone(infoDto.getPhone());
					bedDto.setLatitude(infoDto.getLatitude());
					bedDto.setLongitude(infoDto.getLongitude());
					
					String departments = getDepartmentInfo(bedDto.getHpid());
				    bedDto.setDepartments(departments);
					break;
				}
			}
		}
		
		return bedList;
	}
	// gps 기준 가까운 병원 거리 출력
	public List<EmergencyDto> getNearbyEmergencyList(String stage1, String stage2, double lat, double lon, String symptom){
		List<EmergencyDto> list = getEmergencyApiList(stage1, stage2);
		List<DepartmentScore> departmentScores = getDepartmentScoresBySymptom(symptom);
		
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
		// 정렬 순서, 증상 관련, 가용병상, 가까운 병원
		list.sort(
		        Comparator
		                .comparingInt(EmergencyDto::getRecommendScore).reversed()
		                .thenComparing(Comparator.comparingInt(EmergencyDto::getAvailableBeds).reversed())
		                .thenComparingDouble(EmergencyDto::getDistance)
		);
		
		return list;
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
		String response = restTemplate.getForObject(url, String.class);
		
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
	    dto.setAvailableBeds(item.path("hvec").asInt(0));

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

	    String response = restTemplate.getForObject(url, String.class);

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

	    String response = restTemplate.getForObject(url, String.class);

	    try {
	        ObjectMapper objectMapper = new ObjectMapper();
	        JsonNode root = objectMapper.readTree(response);

	        JsonNode item = root
	                .path("response")
	                .path("body")
	                .path("items")
	                .path("item");

	        return item.path("dgidIdName").asText("");

	    } catch (Exception e) {
	        e.printStackTrace();
	    }

	    return "";
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
