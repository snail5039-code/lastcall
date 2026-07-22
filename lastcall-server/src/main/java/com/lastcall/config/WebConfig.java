package com.lastcall.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

	private final EmergencyRateLimitInterceptor emergencyRateLimitInterceptor;

	@Value("${app.cors.allowed-origins:http://localhost:8081,http://127.0.0.1:8081}")
	private String allowedOrigins;

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		String[] origins = Arrays.stream(allowedOrigins.split(","))
				.map(String::trim)
				.filter(value -> !value.isBlank())
				.toArray(String[]::new);
		registry.addMapping("/**")
				.allowedOrigins(origins)
				.allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
				.allowedHeaders("Content-Type", "Authorization")
				.maxAge(3600);
	}

	@Override
	public void addInterceptors(InterceptorRegistry registry) {
		registry.addInterceptor(emergencyRateLimitInterceptor).addPathPatterns("/emergency/**");
	}
}
