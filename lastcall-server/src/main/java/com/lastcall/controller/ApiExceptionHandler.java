package com.lastcall.controller;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.client.RestClientException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler({ MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class,
			IllegalArgumentException.class })
	public ResponseEntity<ApiError> handleBadRequest(Exception error, HttpServletRequest request) {
		return response(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "요청 값을 확인해주세요.", request);
	}

	@ExceptionHandler(RestClientException.class)
	public ResponseEntity<ApiError> handleExternalApi(RestClientException error, HttpServletRequest request) {
		return response(HttpStatus.SERVICE_UNAVAILABLE, "EXTERNAL_API_UNAVAILABLE",
				"공공데이터 응답이 지연되거나 일시적으로 사용할 수 없습니다.", request);
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiError> handleUnexpected(Exception error, HttpServletRequest request) {
		return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
				"서버 처리 중 오류가 발생했습니다.", request);
	}

	private ResponseEntity<ApiError> response(HttpStatus status, String code, String message,
			HttpServletRequest request) {
		return ResponseEntity.status(status)
				.body(new ApiError(Instant.now().toString(), status.value(), code, message, request.getRequestURI()));
	}

	public record ApiError(String timestamp, int status, String code, String message, String path) {}
}
