package com.lastcall.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lastcall.dto.AedDto;
import com.lastcall.service.AedService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/aed")
public class AedController {

	private final AedService aedService;

	/**
	 * 선택한 시·군·구의 AED 를 요청 좌표에서 가까운 순으로 돌려준다.
	 * AED 는 시·도 하나에 만 대가 넘어 전국 조회를 제공하지 않으므로 보통 stage2 까지 받아야 한다.
	 * 다만 세종처럼 시·군·구가 없는 단층제 시·도가 있어 필수로 두지 않고 검증은 서비스에 맡긴다.
	 */
	@GetMapping("/nearby")
	public List<AedDto> getNearbyAedList(
			@RequestParam String stage1,
			@RequestParam(required = false) String stage2,
			@RequestParam double lat,
			@RequestParam double lon,
			@RequestParam(required = false) String keyword,
			@RequestParam(defaultValue = "50") int limit) {
		return aedService.getNearbyAedList(stage1, stage2, lat, lon, keyword, limit);
	}
}
