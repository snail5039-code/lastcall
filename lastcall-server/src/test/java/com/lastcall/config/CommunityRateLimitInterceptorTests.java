package com.lastcall.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CommunityRateLimitInterceptorTests {

	@Test
	void blocksWriteRequestsOverConfiguredLimit() throws Exception {
		CommunityRateLimitInterceptor interceptor = new CommunityRateLimitInterceptor(1);
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/community/post");
		request.setRemoteAddr("127.0.0.10");

		assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();

		MockHttpServletResponse blocked = new MockHttpServletResponse();
		assertThat(interceptor.preHandle(request, blocked, new Object())).isFalse();
		assertThat(blocked.getStatus()).isEqualTo(429);
		assertThat(blocked.getContentAsString()).contains("RATE_LIMIT_EXCEEDED");
	}

	@Test
	void doesNotRateLimitReadRequests() throws Exception {
		CommunityRateLimitInterceptor interceptor = new CommunityRateLimitInterceptor(1);
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/community/posts");
		request.setRemoteAddr("127.0.0.11");

		assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
		assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
	}
}
