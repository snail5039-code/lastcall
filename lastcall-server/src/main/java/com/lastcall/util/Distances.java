package com.lastcall.util;

/** 위경도 사이의 직선거리 계산. 응급실과 AED 목록이 같은 기준으로 정렬되도록 한곳에 모아둔다. */
public final class Distances {

	private static final double EARTH_RADIUS_KM = 6371.0;

	private Distances() {}

	/** 하버사인 공식으로 구한 두 지점 사이의 거리(km). 소수점 첫째 자리까지 반올림한다. */
	public static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
		double dLat = Math.toRadians(lat2 - lat1);
		double dLon = Math.toRadians(lon2 - lon1);

		double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.cos(Math.toRadians(lat1))
				* Math.cos(Math.toRadians(lat2))
				* Math.sin(dLon / 2)
				* Math.sin(dLon / 2);
		double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return Math.round((EARTH_RADIUS_KM * c) * 10) / 10.0;
	}
}
