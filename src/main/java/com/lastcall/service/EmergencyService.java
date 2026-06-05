package com.lastcall.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.lastcall.dao.EmergencyDao;
import com.lastcall.dto.EmergencyDto;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmergencyService {
	
	private final EmergencyDao emergencyDao;
	
	@Value("${emergency.api.service-key}")
	private String serviceKey;
	
	public List<EmergencyDto> getEmergencyList() {
		return emergencyDao.getEmergencyList();
	}
	
	// api 연결 테스트 
	public String getEmergencyApiTest() {

	    String url = UriComponentsBuilder
	            .fromUriString("http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire")
	            .queryParam("serviceKey", serviceKey)
	            .queryParam("STAGE1", "대전광역시")
	            .queryParam("STAGE2", "중구")
	            .queryParam("pageNo", "1")
	            .queryParam("numOfRows", "10")
	            .build(false)
	            .toUriString();

	    System.out.println("공공 API 요청 URL = " + url);

	    RestTemplate restTemplate = new RestTemplate();

	    return restTemplate.getForObject(url, String.class);
	}

}
