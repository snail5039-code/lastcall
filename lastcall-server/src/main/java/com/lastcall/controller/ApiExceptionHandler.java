package com.lastcall.controller;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler({ MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class,
			IllegalArgumentException.class })
	public ResponseEntity<ApiError> handleBadRequest(Exception error, HttpServletRequest request) {
		return response(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "요청 값을 확인해주세요.", request);
	}

	/**
	 * 없는 경로와 맞지 않는 메서드는 아래 Exception 처리기에 걸려 500 으로 나갔다.
	 * 클라이언트 잘못을 서버 장애로 알리면 원인을 찾기 어려워 따로 구분한다.
	 */
	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<ApiError> handleNotFound(NoResourceFoundException error, HttpServletRequest request) {
		return response(HttpStatus.NOT_FOUND, "NOT_FOUND", "요청한 경로를 찾을 수 없습니다.", request);
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<ApiError> handleMethodNotAllowed(HttpRequestMethodNotSupportedException error,
			HttpServletRequest request) {
		return response(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", "허용되지 않는 요청 방식입니다.", request);
	}

	@ExceptionHandler(RestClientException.class)
	public ResponseEntity<ApiError> handleExternalApi(RestClientException error, HttpServletRequest request) {
		return response(HttpStatus.SERVICE_UNAVAILABLE, "EXTERNAL_API_UNAVAILABLE",
				"공공데이터 응답이 지연되거나 일시적으로 사용할 수 없습니다.", request);
	}

	@ExceptionHandler(ResponseStatusException.class)
	public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException error,
			HttpServletRequest request) {
		String message = error.getReason() == null || error.getReason().isBlank()
				? "요청을 처리할 수 없습니다."
				: error.getReason();
		return ResponseEntity.status(error.getStatusCode())
				.body(new ApiError(Instant.now().toString(), error.getStatusCode().value(),
						"REQUEST_REJECTED", message, request.getRequestURI()));
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
