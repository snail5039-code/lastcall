package com.lastcall.service;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.lastcall.dto.AedDto;
import com.lastcall.util.Distances;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 자동심장충격기(AED) 위치 조회.
 *
 * 응급실과 달리 AED 는 설치 대수가 매우 많아(서울 12,264 / 경기 13,245) 시·도 단위 일괄 조회가 현실적이지 않다.
 * 그래서 시·군·구까지 받아 그 범위만 전부 가져온 뒤, 요청 좌표에서 가까운 순으로 잘라 돌려준다.
 *
 * 주의: AED 데이터는 응급실 데이터와 달리 아직 통합 이전의 시·도 이름을 쓴다.
 * EmergencyService 의 normalizeProvince 를 그대로 적용하면 광주·전남이 0건이 되므로 여기서는 반대로 풀어준다.
 */
@Service
@RequiredArgsConstructor
public class AedService {

	private static final String AED_URL =
			"https://apis.data.go.kr/B552657/AEDInfoInqireService/getAedLcinfoInqire";
	private static final int API_PAGE_SIZE = 1000;
	/** 한 시·군·구가 이보다 많으면 뒷부분은 버린다. 현재 최대가 화성시 1,140대라 충분한 여유다. */
	private static final int MAX_PAGES = 10;
	private static final long CACHE_MILLIS = 6 * 60 * 60 * 1000L;
	private static final int DEFAULT_LIMIT = 50;
	private static final int MAX_LIMIT = 300;
	private static final ZoneId KST = ZoneId.of("Asia/Seoul");

	/** 시·군·구가 없는 단층제 시·도. 여기만 시·군·구 없이 조회를 허용한다(세종 703대). */
	private static final Set<String> PROVINCES_WITHOUT_DISTRICTS = Set.of("세종특별자치시");

	/** 통합 시·도 이름으로 요청이 와도 AED 데이터가 쓰는 옛 이름으로 나눠서 조회한다. */
	private static final Map<String, List<String>> MERGED_PROVINCES = Map.of(
			"전남광주통합특별시", List.of("광주광역시", "전라남도"));

	private final RestTemplate restTemplate;
	private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
	private final Map<String, Object> requestLocks = new ConcurrentHashMap<>();

	@Value("${emergency.api.service-key}")
	private String serviceKey;

	public List<AedDto> getNearbyAedList(String stage1, String stage2, double lat, double lon,
			String keyword, int limit) {
		if (stage1 == null || stage1.isBlank()) {
			throw new IllegalArgumentException("시·도를 선택해주세요.");
		}
		String district = stage2 == null ? "" : stage2.trim();
		if (district.isBlank() && !PROVINCES_WITHOUT_DISTRICTS.contains(stage1.trim())) {
			throw new IllegalArgumentException("AED 는 설치 대수가 많아 시·군·구까지 선택해야 합니다.");
		}

		// 통합 시·도는 옛 이름 두 개로 나눠 조회한다. 한쪽이 실패해도 다른 쪽 결과는 내보낸다.
		// 둘 다 없을 때만 오류로 올린다.
		List<InstalledAed> pool = new ArrayList<>();
		RuntimeException lastError = null;
		for (String province : resolveProvinces(stage1)) {
			try {
				pool.addAll(fetchDistrict(province, district));
			} catch (RuntimeException error) {
				System.err.println("AED 조회 실패, 나머지 지역으로 계속 진행: " + province + "|" + district);
				lastError = error;
			}
		}
		if (pool.isEmpty() && lastError != null) {
			throw lastError;
		}

		int size = limit <= 0 ? DEFAULT_LIMIT : Math.min(limit, MAX_LIMIT);
		LocalDateTime now = LocalDateTime.now(KST);

		return pool.stream()
				.filter(aed -> matchesKeyword(aed, keyword))
				.map(aed -> new Nearby(aed, Distances.haversineKm(lat, lon, aed.latitude(), aed.longitude())))
				.sorted(Comparator.comparingDouble(Nearby::distance))
				.limit(size)
				.map(nearby -> toDto(nearby, now))
				.toList();
	}

	/** 통합 시·도면 옛 이름 여러 개로, 아니면 받은 이름 그대로 조회한다. */
	private List<String> resolveProvinces(String stage1) {
		return MERGED_PROVINCES.getOrDefault(stage1.trim(), List.of(stage1.trim()));
	}

	private boolean matchesKeyword(InstalledAed aed, String keyword) {
		if (keyword == null || keyword.isBlank()) return true;
		String query = keyword.trim().toLowerCase();
		return aed.org().toLowerCase().contains(query)
				|| aed.address().toLowerCase().contains(query)
				|| aed.place().toLowerCase().contains(query);
	}

	/** 한 시·군·구의 AED 를 모든 페이지에 걸쳐 가져온다. 좌표가 없으면 지도에 쓸 수 없으므로 버린다. */
	private List<InstalledAed> fetchDistrict(String province, String district) {
		String key = province + "|" + district;
		CacheEntry cached = cache.get(key);
		if (isFresh(cached)) return cached.items();

		Object lock = requestLocks.computeIfAbsent(key, ignored -> new Object());
		synchronized (lock) {
			cached = cache.get(key);
			if (isFresh(cached)) return cached.items();

			List<InstalledAed> collected = new ArrayList<>();
			try {
				int totalCount = Integer.MAX_VALUE;
				for (int page = 1; page <= MAX_PAGES && collected.size() < totalCount; page++) {
					JsonNode body = new ObjectMapper()
							.readTree(restTemplate.getForObject(pageUrl(province, district, page), String.class))
							.path("response").path("body");
					totalCount = body.path("totalCount").asInt(0);

					JsonNode items = body.path("items").path("item");
					if (items.isMissingNode() || items.isNull()) break;

					int before = collected.size();
					if (items.isArray()) {
						items.forEach(item -> addIfMappable(collected, item));
					} else {
						addIfMappable(collected, items);
					}
					if (collected.size() == before) break;
				}
			} catch (RuntimeException error) {
				if (cached != null) {
					System.err.println("AED 조회 실패, 만료된 캐시로 계속 진행: " + key);
					return cached.items();
				}
				throw error;
			}

			List<InstalledAed> result = List.copyOf(dedupe(collected));
			cache.put(key, new CacheEntry(result, System.currentTimeMillis()));
			return result;
		}
	}

	private boolean isFresh(CacheEntry entry) {
		return entry != null && System.currentTimeMillis() - entry.createdAt() < CACHE_MILLIS;
	}

	private String pageUrl(String province, String district, int page) {
		UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(AED_URL)
				.queryParam("serviceKey", serviceKey)
				.queryParam("Q0", province);
		if (!district.isBlank()) {
			builder.queryParam("Q1", district);
		}
		return builder
				.queryParam("pageNo", page)
				.queryParam("numOfRows", API_PAGE_SIZE)
				.queryParam("_type", "json")
				.build(false)
				.toUriString();
	}

	private void addIfMappable(List<InstalledAed> target, JsonNode item) {
		double latitude = item.path("wgs84Lat").asDouble(0);
		double longitude = item.path("wgs84Lon").asDouble(0);
		if (latitude == 0 || longitude == 0) return;

		target.add(new InstalledAed(
				item.path("serialSeq").asString(""),
				item.path("org").asString(""),
				item.path("buildAddress").asString(""),
				item.path("buildPlace").asString(""),
				latitude,
				longitude,
				item.path("mfg").asString(""),
				item.path("model").asString(""),
				weeklyHours(item)));
	}

	private List<InstalledAed> dedupe(List<InstalledAed> items) {
		Map<String, InstalledAed> unique = new LinkedHashMap<>();
		items.forEach(aed -> unique.putIfAbsent(
				aed.serialSeq().isBlank() ? aed.latitude() + "," + aed.longitude() + "," + aed.place() : aed.serialSeq(),
				aed));
		return new ArrayList<>(unique.values());
	}

	/**
	 * 요일별 운영시간을 통째로 담아둔다. 캐시가 6시간 유지되므로 자정을 넘겨 재사용될 수 있어,
	 * 수집 시점이 아니라 응답을 만드는 시점에 오늘 요일을 골라야 한다.
	 */
	private Map<DayOfWeek, String> weeklyHours(JsonNode item) {
		Map<DayOfWeek, String> hours = new LinkedHashMap<>();
		for (DayOfWeek day : DayOfWeek.values()) {
			String prefix = weekdayPrefix(day);
			hours.put(day, item.path(prefix + "SttTme").asString("") + "-" + item.path(prefix + "EndTme").asString(""));
		}
		return Map.copyOf(hours);
	}

	private String weekdayPrefix(DayOfWeek day) {
		return switch (day) {
			case MONDAY -> "mon";
			case TUESDAY -> "tue";
			case WEDNESDAY -> "wed";
			case THURSDAY -> "thu";
			case FRIDAY -> "fri";
			case SATURDAY -> "sat";
			case SUNDAY -> "sun";
		};
	}

	private AedDto toDto(Nearby nearby, LocalDateTime now) {
		InstalledAed aed = nearby.aed();
		AedDto dto = new AedDto();
		dto.setSerialSeq(aed.serialSeq());
		dto.setOrg(aed.org());
		dto.setAddress(aed.address());
		dto.setPlace(aed.place());
		dto.setLatitude(aed.latitude());
		dto.setLongitude(aed.longitude());
		dto.setDistance(nearby.distance());
		dto.setManufacturer(aed.manufacturer());
		dto.setModel(aed.model());
		applyTodayHours(dto, aed.weeklyHours().get(now.getDayOfWeek()), now);
		return dto;
	}

	/** "0000-2400" 형태의 원본값을 사람이 읽는 표시값과 현재 이용 가능 여부로 바꾼다. */
	private void applyTodayHours(AedDto dto, String rawHours, LocalDateTime now) {
		String[] parts = (rawHours == null ? "" : rawHours).split("-", 2);
		Integer start = parseTime(parts.length > 0 ? parts[0] : "");
		Integer end = parseTime(parts.length > 1 ? parts[1] : "");

		if (start == null || end == null) {
			dto.setHoursText("운영시간 확인 필요");
			dto.setOpenNow(null);
			return;
		}
		if (start == 0 && end >= 2400) {
			dto.setHoursText("24시간");
			dto.setOpenNow(true);
			return;
		}

		int current = now.getHour() * 100 + now.getMinute();
		dto.setHoursText(formatTime(start) + "~" + formatTime(end));
		dto.setOpenNow(end >= start ? current >= start && current < end : current >= start || current < end);
	}

	private Integer parseTime(String value) {
		String digits = value == null ? "" : value.trim().replaceAll("\\D", "");
		if (digits.isEmpty()) return null;
		try {
			int parsed = Integer.parseInt(digits);
			return parsed < 0 || parsed > 2400 ? null : parsed;
		} catch (NumberFormatException error) {
			return null;
		}
	}

	private String formatTime(int value) {
		return String.format("%02d:%02d", Math.min(value / 100, 24), value % 100);
	}

	/**
	 * 캐시에 담기는 설치 정보. 거리는 요청 좌표마다 달라지므로 여기 두지 않는다.
	 * 공공데이터의 관리책임자 이름·연락처는 개인정보라 아예 담지 않는다.
	 */
	private record InstalledAed(String serialSeq, String org, String address, String place,
			double latitude, double longitude, String manufacturer, String model,
			Map<DayOfWeek, String> weeklyHours) {}

	private record Nearby(InstalledAed aed, double distance) {}

	private record CacheEntry(List<InstalledAed> items, long createdAt) {}
}
