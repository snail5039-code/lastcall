package com.lastcall.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyDto {
	
	private String hospitalName; // 이름
	private String address; // 주소
	private String phone; // 전화번호
	// 좌표 값
	private double latitude; // 위도
	private double longitude; // 경도
	
	private int availavleBeds; // 가용 병상 수 
}
