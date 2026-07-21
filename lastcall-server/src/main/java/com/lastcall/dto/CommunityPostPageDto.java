package com.lastcall.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CommunityPostPageDto {

	private List<CommunityPostDto> posts;

	private int currentPage;

	private int totalPages;

	private long totalElements;

	private boolean hasNext;
}