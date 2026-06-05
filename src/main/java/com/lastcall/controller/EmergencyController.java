package com.lastcall.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lastcall.dto.EmergencyDto;
import com.lastcall.service.EmergencyService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class EmergencyController {
	
	private final EmergencyService emergencyService; 
	
	@GetMapping("/emergency/list") // 병원 목록 조회
	public List<EmergencyDto> emergencyList() {
		return emergencyService.getEmergencyList();
	}
	
	@GetMapping("/emergency/api-test") // 공공 API 호출 테스트
	public String emergencyApiTest() {
		return emergencyService.getEmergencyApiTest();
	}
}
