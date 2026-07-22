package com.lastcall.config;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class EmergencyRateLimitInterceptor implements HandlerInterceptor {

	private final Map<String, RequestWindow> windows = new ConcurrentHashMap<>();
	private final int requestsPerMinute;
	private final int warmupRequestsPerMinute;

	public EmergencyRateLimitInterceptor(
			@Value("${app.rate-limit.emergency-per-minute:120}") int requestsPerMinute,
			@Value("${app.rate-limit.warmup-per-minute:20}") int warmupRequestsPerMinute) {
		this.requestsPerMinute = requestsPerMinute;
		this.warmupRequestsPerMinute = warmupRequestsPerMinute;
	}

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
		long minute = Instant.now().getEpochSecond() / 60;
		boolean warmup = request.getRequestURI().startsWith("/emergency/warmup");
		int limit = warmup ? warmupRequestsPerMinute : requestsPerMinute;
		String key = request.getRemoteAddr() + (warmup ? ":warmup" : ":emergency");
		RequestWindow window = windows.compute(key, (ignored, current) ->
				current == null || current.minute() != minute
						? new RequestWindow(minute, new AtomicInteger(1))
						: increment(current));

		if (windows.size() > 10_000) {
			windows.entrySet().removeIf(entry -> entry.getValue().minute() < minute - 1);
		}

		if (window.count().get() <= limit) return true;

		response.setStatus(429);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		response.setHeader("Retry-After", "60");
		response.getWriter().write("{\"code\":\"RATE_LIMIT_EXCEEDED\",\"message\":\"요청이 너무 많습니다. 잠시 후 다시 시도해주세요.\"}");
		return false;
	}

	private RequestWindow increment(RequestWindow window) {
		window.count().incrementAndGet();
		return window;
	}

	private record RequestWindow(long minute, AtomicInteger count) {}
}
