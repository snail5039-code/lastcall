package com.lastcall.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import com.lastcall.dto.AedDto;

/** 공공데이터 응답은 목으로 대신하고, 거리·반경·운영시간·지역 검증 같은 서비스 자체 로직을 확인한다. */
class AedServiceTests {

	private RestTemplate restTemplate;
	private AedService service;

	@BeforeEach
	void setUp() {
		restTemplate = mock(RestTemplate.class);
		service = new AedService(restTemplate);
		ReflectionTestUtils.setField(service, "serviceKey", "test-key");
	}

	/** 모든 요일에 같은 운영시간을 넣은 AED 한 건. 실행 요일에 상관없이 결과가 같아지게 한다. */
	private String item(String serial, String org, double lat, double lon, String start, String end) {
		StringBuilder days = new StringBuilder();
		for (String day : List.of("mon", "tue", "wed", "thu", "fri", "sat", "sun")) {
			days.append(",\"").append(day).append("SttTme\":\"").append(start).append("\"")
					.append(",\"").append(day).append("EndTme\":\"").append(end).append("\"");
		}
		return "{\"serialSeq\":\"" + serial + "\",\"org\":\"" + org + "\",\"buildAddress\":\"주소\","
				+ "\"buildPlace\":\"1층\",\"wgs84Lat\":" + lat + ",\"wgs84Lon\":" + lon
				+ ",\"mfg\":\"제조사\",\"model\":\"모델\"" + days + "}";
	}

	private String response(String... items) {
		return "{\"response\":{\"body\":{\"totalCount\":" + items.length
				+ ",\"items\":{\"item\":[" + String.join(",", items) + "]}}}}";
	}

	private void stubAll(String json) {
		when(restTemplate.getForObject(org.mockito.ArgumentMatchers.anyString(), eq(String.class))).thenReturn(json);
	}

	@Test
	void sortsByDistanceFromRequestPoint() {
		stubAll(response(
				item("1", "먼곳", 37.60, 127.00, "0000", "2400"),
				item("2", "가까운곳", 37.5666, 126.9781, "0000", "2400")));

		List<AedDto> result = service.getNearbyAedList("서울특별시", "중구", 37.5665, 126.978, null, 50);

		assertThat(result).extracting(AedDto::getOrg).containsExactly("가까운곳", "먼곳");
		assertThat(result.get(0).getDistance()).isLessThan(result.get(1).getDistance());
	}

	@Test
	void radiusKeepsOnlyAedsWithinDistance() {
		stubAll(response(
				item("1", "근처", 37.5670, 126.9785, "0000", "2400"),
				item("2", "멀리", 37.6500, 127.0500, "0000", "2400")));

		List<AedDto> result = service.getNearbyAedList("서울특별시", "중구", 37.5665, 126.978, null, 50, 1.0);

		assertThat(result).extracting(AedDto::getOrg).containsExactly("근처");
	}

	@Test
	void zeroRadiusMeansNoDistanceLimit() {
		stubAll(response(
				item("1", "근처", 37.5670, 126.9785, "0000", "2400"),
				item("2", "멀리", 37.6500, 127.0500, "0000", "2400")));

		assertThat(service.getNearbyAedList("서울특별시", "중구", 37.5665, 126.978, null, 50, 0)).hasSize(2);
	}

	@Test
	void dropsAedsWithoutCoordinates() {
		stubAll(response(
				item("1", "좌표없음", 0, 0, "0000", "2400"),
				item("2", "정상", 37.5670, 126.9785, "0000", "2400")));

		List<AedDto> result = service.getNearbyAedList("서울특별시", "중구", 37.5665, 126.978, null, 50);

		assertThat(result).extracting(AedDto::getOrg).containsExactly("정상");
	}

	@Test
	void keywordMatchesOrgAddressOrPlace() {
		stubAll(response(
				item("1", "중앙병원", 37.5670, 126.9785, "0000", "2400"),
				item("2", "구청", 37.5671, 126.9786, "0000", "2400")));

		List<AedDto> result = service.getNearbyAedList("서울특별시", "중구", 37.5665, 126.978, "병원", 50);

		assertThat(result).extracting(AedDto::getOrg).containsExactly("중앙병원");
	}

	@Test
	void limitCutsResultToClosestAeds() {
		stubAll(response(
				item("1", "A", 37.5670, 126.9785, "0000", "2400"),
				item("2", "B", 37.5700, 126.9800, "0000", "2400"),
				item("3", "C", 37.5800, 126.9900, "0000", "2400")));

		List<AedDto> result = service.getNearbyAedList("서울특별시", "중구", 37.5665, 126.978, null, 2);

		assertThat(result).extracting(AedDto::getOrg).containsExactly("A", "B");
	}

	@Test
	void allDayHoursAreAlwaysOpen() {
		stubAll(response(item("1", "A", 37.5670, 126.9785, "0000", "2400")));

		AedDto dto = service.getNearbyAedList("서울특별시", "중구", 37.5665, 126.978, null, 50).get(0);

		assertThat(dto.getHoursText()).isEqualTo("24시간");
		assertThat(dto.getOpenNow()).isTrue();
	}

	@Test
	void unreadableHoursAreReportedAsUnknown() {
		stubAll(response(item("1", "A", 37.5670, 126.9785, "", "")));

		AedDto dto = service.getNearbyAedList("서울특별시", "중구", 37.5665, 126.978, null, 50).get(0);

		assertThat(dto.getHoursText()).isEqualTo("운영시간 확인 필요");
		assertThat(dto.getOpenNow()).isNull();
	}

	@Test
	void requiresDistrictExceptForSingleTierProvince() {
		assertThatThrownBy(() -> service.getNearbyAedList("서울특별시", "", 37.5, 127.0, null, 50))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> service.getNearbyAedList(" ", "중구", 37.5, 127.0, null, 50))
				.isInstanceOf(IllegalArgumentException.class);

		stubAll(response(item("1", "세종", 36.48, 127.28, "0000", "2400")));
		assertThat(service.getNearbyAedList("세종특별자치시", "", 36.48, 127.28, null, 50)).hasSize(1);
	}

	@Test
	void mergedProvinceIsQueriedAsItsTwoFormerProvinces() {
		stubAll(response(item("1", "A", 35.16, 126.85, "0000", "2400")));

		service.getNearbyAedList("전남광주통합특별시", "광산구", 35.16, 126.85, null, 50);

		verify(restTemplate, times(1)).getForObject(argThat((String url) -> url.contains("Q0=광주광역시")), eq(String.class));
		verify(restTemplate, times(1)).getForObject(argThat((String url) -> url.contains("Q0=전라남도")), eq(String.class));
	}

	@Test
	void secondRequestForSameDistrictUsesCache() {
		stubAll(response(item("1", "A", 37.5670, 126.9785, "0000", "2400")));

		service.getNearbyAedList("서울특별시", "중구", 37.5665, 126.978, null, 50);
		service.getNearbyAedList("서울특별시", "중구", 37.5665, 126.978, null, 50);

		verify(restTemplate, times(1)).getForObject(org.mockito.ArgumentMatchers.anyString(), eq(String.class));
	}
}
