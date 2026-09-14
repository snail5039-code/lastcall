package com.lastcall.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import com.lastcall.dao.EmergencyDao;

/**
 * 광주광역시와 전라남도는 행정구역 통합으로 공공데이터에서 사라졌고 전남광주통합특별시만 남았다.
 * 옛 이름으로 조회하면 totalCount 가 0 으로 돌아와 해당 지역 응급실이 한 곳도 검색되지 않으므로,
 * 옛 이름이 다시 흘러들어와도 조회가 비지 않는지 확인한다.
 */
class EmergencyServiceProvinceTests {

	private static final String MERGED = "전남광주통합특별시";

	private final EmergencyService service = new EmergencyService(mock(EmergencyDao.class), mock(RestTemplate.class));

	@Test
	void mapsRetiredProvinceNamesToMergedName() {
		assertThat(service.normalizeProvince("광주광역시")).isEqualTo(MERGED);
		assertThat(service.normalizeProvince("전라남도")).isEqualTo(MERGED);
	}

	@Test
	void keepsProvincesThatStillExist() {
		assertThat(service.normalizeProvince("서울특별시")).isEqualTo("서울특별시");
		assertThat(service.normalizeProvince("경기도")).isEqualTo("경기도");
		assertThat(service.normalizeProvince(MERGED)).isEqualTo(MERGED);
	}

	@Test
	void trimsSurroundingWhitespaceFromReverseGeocodedNames() {
		assertThat(service.normalizeProvince("  광주광역시 ")).isEqualTo(MERGED);
		assertThat(service.normalizeProvince(" 서울특별시")).isEqualTo("서울특별시");
	}

	@Test
	void toleratesMissingProvince() {
		assertThat(service.normalizeProvince(null)).isNull();
	}
}
