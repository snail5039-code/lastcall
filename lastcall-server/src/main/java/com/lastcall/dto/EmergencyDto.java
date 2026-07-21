package com.lastcall.dto;

import java.util.ArrayList;
import java.util.List;

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
	
	private int availableBeds; // 가용 병상 수 
	private int operatingRooms;
	private int neuroIcuBeds;
	private int neonatalIcuBeds;
	private int chestIcuBeds;
	private int generalIcuBeds;
	private int inpatientBeds;

	private boolean ctAvailable;
	private boolean mriAvailable;
	private boolean angiographyAvailable;
	private boolean ventilatorAvailable;
	private boolean ambulanceAvailable;
	private boolean pediatricVentilatorAvailable;
	private boolean incubatorAvailable;
	private List<String> severeCapabilities = new ArrayList<>();
	
	private String hpid; // 공공 api 구분 id
	private String emergencyPhone; // 응급실 전화번호
	
	private double distance; // 내 주변 거리 계산
	
	private String departments; // 진료 과목
	
	private int recommendScore; // 원인에 맞는 진료 추천 점수
	private String matchedDepartments;
}
