package com.lastcall.config;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class HttpClientConfig {

	@Bean
	RestTemplate emergencyRestTemplate(
			@Value("${emergency.api.connect-timeout:3s}") Duration connectTimeout,
			@Value("${emergency.api.read-timeout:8s}") Duration readTimeout) {
		SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
		factory.setConnectTimeout(connectTimeout);
		factory.setReadTimeout(readTimeout);
		return new RestTemplate(factory);
	}
}
