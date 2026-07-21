package com.lastcall.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lastcall.dto.CommunityCommentDto;
import com.lastcall.dto.CommunityPostDto;
import com.lastcall.dto.CommunityPostPageDto;
import com.lastcall.dto.CommunityReportDto;
import com.lastcall.dto.AdminLoginDto;
import com.lastcall.dto.AdminSessionDto;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.RequestHeader;
import com.lastcall.service.CommunityService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/community")
@RequiredArgsConstructor
public class CommunityController {

	private final CommunityService communityService;

	// 게시글 등록
	@PostMapping("/post")
	public Long insertPost(@RequestBody CommunityPostDto communityPostDto) {
		communityService.insertPost(communityPostDto);
		return communityPostDto.getId();
	}

	// 게시판 종류별 게시글 목록 조회
	@GetMapping("/posts")
	public CommunityPostPageDto selectPostList(@RequestParam String boardType,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
		return communityService.selectPostList(boardType, page, size);
	}

	// 게시글 상세 조회
	@GetMapping("/post/{id}")
	public CommunityPostDto selectPostById(@PathVariable Long id) {
		return communityService.selectPostById(id);
	}

	// 게시글 수정
	@PutMapping("/post/{id}")
	public int updatePost(@PathVariable Long id, @RequestBody CommunityPostDto communityPostDto) {
		communityPostDto.setId(id);

		return communityService.updatePost(communityPostDto);
	}

	// 게시글 삭제
	@DeleteMapping("/post/{id}")
	public int deletePost(@PathVariable Long id, @RequestParam String password) {
		return communityService.deletePost(id, password);
	}

	// 좋아요 증가
	@PutMapping("/post/{id}/like")
	public int increaseLikeCount(@PathVariable Long id) {
		return communityService.increaseLikeCount(id);
	}

	// 댓글 등록
	@PostMapping("/comment")
	public int insertComment(@RequestBody CommunityCommentDto communityCommentDto) {
		return communityService.insertComment(communityCommentDto);
	}

	// 게시글별 댓글 목록 조회
	@GetMapping("/post/{postId}/comments")
	public List<CommunityCommentDto> selectCommentList(@PathVariable Long postId) {
		return communityService.selectCommentList(postId);
	}

	// 댓글 수정
	@PutMapping("/comment/{id}")
	public int updateComment(@PathVariable Long id, @RequestBody CommunityCommentDto communityCommentDto) {
		communityCommentDto.setId(id);

		return communityService.updateComment(communityCommentDto);
	}

	// 댓글 삭제
	@DeleteMapping("/comment/{id}")
	public int deleteComment(@PathVariable Long id, @RequestParam String password) {
		return communityService.deleteComment(id, password);
	}

	@PostMapping("/report")
	public int reportContent(@RequestBody CommunityReportDto reportDto) {
		return communityService.insertReport(reportDto);
	}

	@PostMapping("/admin/login")
	public AdminSessionDto loginAdmin(@RequestBody AdminLoginDto loginDto, HttpServletRequest request) {
		return communityService.loginAdmin(loginDto.getUsername(), loginDto.getPassword(), request.getRemoteAddr());
	}

	@GetMapping("/admin/reports")
	public List<CommunityReportDto> selectAdminReports(
			@RequestHeader(value = "Authorization", required = false) String authorization,
			@RequestParam(defaultValue = "PENDING") String status) {
		communityService.requireAdmin(authorization);
		return communityService.selectAdminReports(status);
	}

	@PutMapping("/admin/reports/{id}/resolve")
	public int resolveAdminReport(@PathVariable Long id,
			@RequestHeader(value = "Authorization", required = false) String authorization) {
		communityService.requireAdmin(authorization);
		return communityService.resolveAdminReport(id);
	}

	@DeleteMapping("/admin/reports/{id}/content")
	public int deleteReportedContent(@PathVariable Long id,
			@RequestHeader(value = "Authorization", required = false) String authorization) {
		communityService.requireAdmin(authorization);
		return communityService.deleteReportedContent(id);
	}

	@DeleteMapping("/admin/posts/{id}")
	public int deletePostAsAdmin(@PathVariable Long id,
			@RequestHeader(value = "Authorization", required = false) String authorization) {
		communityService.requireAdmin(authorization);
		return communityService.deletePostAsAdmin(id);
	}

	@PostMapping("/admin/logout")
	public void logoutAdmin(@RequestHeader(value = "Authorization", required = false) String authorization) {
		communityService.requireAdmin(authorization);
		communityService.logoutAdmin(authorization);
	}
}
