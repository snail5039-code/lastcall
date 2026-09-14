package com.lastcall.controller;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.http.HttpMethod;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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

	@Test
	void reportsUnknownPathAsNotFound() {
		ApiExceptionHandler handler = new ApiExceptionHandler();
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/does-not-exist");

		var response = handler.handleNotFound(
				new NoResourceFoundException(HttpMethod.GET, "/does-not-exist", "does-not-exist"), request);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
		assertThat(response.getBody()).isNotNull();
		assertThat(response.getBody().code()).isEqualTo("NOT_FOUND");
		assertThat(response.getBody().path()).isEqualTo("/does-not-exist");
	}

	@Test
	void reportsWrongMethodAsMethodNotAllowed() {
		ApiExceptionHandler handler = new ApiExceptionHandler();
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/aed/nearby");

		var response = handler.handleMethodNotAllowed(
				new HttpRequestMethodNotSupportedException("POST"), request);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.METHOD_NOT_ALLOWED);
		assertThat(response.getBody()).isNotNull();
		assertThat(response.getBody().code()).isEqualTo("METHOD_NOT_ALLOWED");
	}
}
