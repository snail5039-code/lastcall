package com.lastcall.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import java.time.Duration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import com.lastcall.dao.CommunityDao;
import com.lastcall.dto.AdminSessionDto;

class CommunityServiceAdminAuthTests {

	private CommunityService service;

	@BeforeEach
	void setUp() {
		service = new CommunityService(mock(CommunityDao.class));
		ReflectionTestUtils.setField(service, "adminUsername", "release-operator");
		ReflectionTestUtils.setField(service, "adminPasswordHash",
				new BCryptPasswordEncoder(12).encode("a-long-random-test-password"));
		ReflectionTestUtils.setField(service, "adminSessionDuration", Duration.ofHours(1));
	}

	@Test
	void authenticatesWithBcryptHashAndIssuesOneHourSession() {
		long beforeLogin = System.currentTimeMillis();
		AdminSessionDto session = service.loginAdmin(
				"release-operator", "a-long-random-test-password", "127.0.0.1");

		assertThat(session.getToken()).hasSizeGreaterThanOrEqualTo(64);
		assertThat(session.getExpiresAt()).isBetween(
				beforeLogin + Duration.ofMinutes(59).toMillis(),
				beforeLogin + Duration.ofMinutes(61).toMillis());
	}

	@Test
	void rejectsWrongCredentials() {
		assertThatThrownBy(() -> service.loginAdmin(
				"release-operator", "wrong-password", "127.0.0.2"))
				.isInstanceOf(ResponseStatusException.class)
				.hasMessageContaining("401");
	}

	@Test
	void disablesAdminLoginWhenHashIsMissing() {
		ReflectionTestUtils.setField(service, "adminPasswordHash", "");

		assertThatThrownBy(() -> service.loginAdmin(
				"release-operator", "a-long-random-test-password", "127.0.0.3"))
				.isInstanceOf(ResponseStatusException.class)
				.hasMessageContaining("503");
	}

	@Test
	void rejectsBcryptHashBelowCostTwelve() {
		ReflectionTestUtils.setField(service, "adminPasswordHash",
				new BCryptPasswordEncoder(10).encode("a-long-random-test-password"));

		assertThatThrownBy(() -> service.loginAdmin(
				"release-operator", "a-long-random-test-password", "127.0.0.4"))
				.isInstanceOf(ResponseStatusException.class)
				.hasMessageContaining("503");
	}
}
