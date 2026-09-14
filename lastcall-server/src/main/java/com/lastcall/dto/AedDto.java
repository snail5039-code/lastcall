package com.lastcall.dto;

import lombok.Data;

/**
 * 자동심장충격기(AED) 한 대의 설치 정보.
 * 공공데이터에는 관리책임자 이름과 연락처가 함께 오지만 개인정보라 이 DTO 에 담지 않는다.
 */
@Data
public class AedDto {

	/** 공공데이터의 설치 일련번호. 목록에서 항목을 구분하는 키로 쓴다. */
	private String serialSeq;
	/** 설치 기관명 (예: 반포자이아파트) */
	private String org;
	/** 도로명 주소 */
	private String address;
	/** 건물 안에서의 상세 위치 (예: 132동앞) */
	private String place;
	private double latitude;
	private double longitude;
	/** 요청 좌표로부터의 거리(km) */
	private double distance;
	private String manufacturer;
	private String model;
	/** 오늘 기준 지금 이용할 수 있는지. 운영시간을 해석하지 못하면 null 이다. */
	private Boolean openNow;
	/** 오늘의 운영시간 표시값 (예: 24시간, 09:00~18:00) */
	private String hoursText;
}
