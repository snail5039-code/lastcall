package com.lastcall.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

/** 병상 정보 갱신 시각의 해석과 오래된 정보 판정. 앱의 표시 기준(15분)과 어긋나지 않는지 확인한다. */
class EmergencyServiceFreshnessTests {

	private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 5, 12, 0, 0);

	@Test
	void normalizesVariousTimestampFormatsToFourteenDigits() {
		assertThat(EmergencyService.updatedAtDigits("20261105091233")).isEqualTo("20261105091233");
		assertThat(EmergencyService.updatedAtDigits("2026-11-05 09:12:33")).isEqualTo("20261105091233");
		assertThat(EmergencyService.updatedAtDigits("2026-11-05T09:12")).isEqualTo("20261105091200");
	}

	@Test
	void returnsEmptyForMissingOrShortTimestamps() {
		assertThat(EmergencyService.updatedAtDigits(null)).isEmpty();
		assertThat(EmergencyService.updatedAtDigits("")).isEmpty();
		assertThat(EmergencyService.updatedAtDigits("20261105")).isEmpty();
	}

	@Test
	void recentUpdateIsNotStale() {
		assertThat(EmergencyService.isStale("20261105114500", NOW)).isFalse();
		assertThat(EmergencyService.isStale("2026-11-05 11:59:00", NOW)).isFalse();
	}

	@Test
	void exactlyFifteenMinutesIsStillFresh() {
		assertThat(EmergencyService.isStale("20261105114500", NOW)).isFalse();
		assertThat(EmergencyService.isStale("20261105114459", NOW)).isTrue();
	}

	@Test
	void oldOrMissingUpdateIsStale() {
		assertThat(EmergencyService.isStale("20261105080000", NOW)).isTrue();
		assertThat(EmergencyService.isStale(null, NOW)).isTrue();
		assertThat(EmergencyService.isStale("", NOW)).isTrue();
	}

	@Test
	void impossibleDateIsTreatedAsStale() {
		assertThat(EmergencyService.isStale("20269999999999", NOW)).isTrue();
	}
}
