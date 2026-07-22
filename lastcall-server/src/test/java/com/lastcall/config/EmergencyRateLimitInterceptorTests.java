package com.lastcall.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class EmergencyRateLimitInterceptorTests {

	@Test
	void blocksRequestsOverConfiguredLimit() throws Exception {
		EmergencyRateLimitInterceptor interceptor = new EmergencyRateLimitInterceptor(2, 1);
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/emergency/nearby");
		request.setRemoteAddr("127.0.0.1");

		assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
		assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();

		MockHttpServletResponse blocked = new MockHttpServletResponse();
		assertThat(interceptor.preHandle(request, blocked, new Object())).isFalse();
		assertThat(blocked.getStatus()).isEqualTo(429);
		assertThat(blocked.getContentAsString()).contains("RATE_LIMIT_EXCEEDED");
		assertThat(blocked.getHeader("Retry-After")).isEqualTo("60");
	}

	@Test
	void appliesSeparateLowerLimitToWarmup() throws Exception {
		EmergencyRateLimitInterceptor interceptor = new EmergencyRateLimitInterceptor(10, 1);
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/emergency/warmup");
		request.setRemoteAddr("127.0.0.2");

		assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
		assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isFalse();
	}
}
