package com.lastcall.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

class ApiExceptionHandlerTests {

	@Test
	void preservesResponseStatusExceptionStatus() {
		ApiExceptionHandler handler = new ApiExceptionHandler();
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/community/admin/reports");

		var response = handler.handleResponseStatus(
				new ResponseStatusException(HttpStatus.UNAUTHORIZED, "관리자 로그인이 필요합니다."),
				request);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
		assertThat(response.getBody()).isNotNull();
		assertThat(response.getBody().status()).isEqualTo(401);
		assertThat(response.getBody().message()).isEqualTo("관리자 로그인이 필요합니다.");
	}
}
