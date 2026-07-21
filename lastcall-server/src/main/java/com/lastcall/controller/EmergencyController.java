package com.lastcall.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lastcall.dto.EmergencyDto;
import com.lastcall.service.EmergencyService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/emergency")
public class EmergencyController {
	
	private final EmergencyService emergencyService; 
	
	@GetMapping("/list") // 병원 목록 조회
	public List<EmergencyDto> emergencyList() {
		return emergencyService.getEmergencyList();
	}
	
	@GetMapping("/api-test") // 공공 API 호출 테스트
	public String emergencyApiTest() {
		return emergencyService.getEmergencyApiTest();
	}
	
	@GetMapping("/api-list") // 병원 리스트
	public List<EmergencyDto> getEmergencyApiList(@RequestParam String stage1, @RequestParam String stage2){
		return emergencyService.getEmergencyApiList(stage1, stage2);
	}
	
	@GetMapping("/nearby") // 근처 병원 
	public List<EmergencyDto> getNearbyEmergencyList(@RequestParam String stage1, @RequestParam(required = false) String stage2, @RequestParam double lat, @RequestParam double lon, @RequestParam(required = false) String symptom){
		System.out.println("선택 증상 = " + symptom);
		
		return emergencyService.getNearbyEmergencyList(stage1, stage2, lat, lon, symptom);
	}
	
	@GetMapping("/basic-info-test") // 진료 과목 받아오기 테스트 겸 실제 받아오기
	public String basicInfoTest(@RequestParam String hpid) {
	    return emergencyService.getHospitalBasicInfoTest(hpid);
	}
}
