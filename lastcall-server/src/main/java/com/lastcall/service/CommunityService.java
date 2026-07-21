package com.lastcall.service;

import java.util.List;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lastcall.dao.CommunityDao;
import com.lastcall.dto.CommunityCommentDto;
import com.lastcall.dto.CommunityPostDto;
import com.lastcall.dto.CommunityPostPageDto;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CommunityService {

	private final CommunityDao communityDao;
	private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

	// 게시글 등록
	public int insertPost(CommunityPostDto communityPostDto) {

		System.out.println("=== 게시글 등록 요청 ===");
		System.out.println("boardType: " + communityPostDto.getBoardType());
		System.out.println("nickname: " + communityPostDto.getNickname());
		System.out.println("title: " + communityPostDto.getTitle());
		System.out.println("content: " + communityPostDto.getContent());

		String boardType = communityPostDto.getBoardType();

		if (!"FREE".equals(boardType) && !"SUGGESTION".equals(boardType) && !"QNA".equals(boardType)) {
			throw new IllegalArgumentException("등록할 수 없는 게시판 종류입니다.");
		}

		if (communityPostDto.getNickname() == null || communityPostDto.getNickname().isBlank()) {
			throw new IllegalArgumentException("닉네임을 입력해주세요.");
		}

		if (communityPostDto.getPassword() == null || communityPostDto.getPassword().isBlank()) {
			throw new IllegalArgumentException("비밀번호를 입력해주세요.");
		}

		if (communityPostDto.getTitle() == null || communityPostDto.getTitle().isBlank()) {
			throw new IllegalArgumentException("제목을 입력해주세요.");
		}

		if (communityPostDto.getContent() == null || communityPostDto.getContent().isBlank()) {
			throw new IllegalArgumentException("내용을 입력해주세요.");
		}

		String passwordHash = passwordEncoder.encode(communityPostDto.getPassword());

		communityPostDto.setPasswordHash(passwordHash);

		return communityDao.insertPost(communityPostDto);
	}

	// 게시판 종류별 목록 조회
	public CommunityPostPageDto selectPostList(String boardType, int page, int size) {
		// 건너뛸 페이지 계산 
		int offset = page * size;
		// 보여줄 게시글 size : 몇개, offest : 건너뛸지 
		List<CommunityPostDto> posts = communityDao.selectPostList(boardType, size, offset);
		// 전체 게시글 개수
		long totalElements = communityDao.countPostList(boardType);
		// 전체 페이지 수
		int totalPages = (int) Math.ceil((double) totalElements / size);
		// 다음 페이지 존재 여부
		boolean hasNext = page + 1 < totalPages;

		return new CommunityPostPageDto(posts, page, totalPages, totalElements, hasNext);
	}

	// 게시글 상세 조회 + 조회수 증가
	@Transactional
	public CommunityPostDto selectPostById(Long id) {

		communityDao.increaseViewCount(id);

		return communityDao.selectPostById(id);
	}

	// 게시글 수정
	public int updatePost(CommunityPostDto communityPostDto) {

		CommunityPostDto savedCommunityPostDto = communityDao.selectPostById(communityPostDto.getId());

		if (savedCommunityPostDto == null) {
			return 0;
		}

		boolean passwordMatches = passwordEncoder.matches(communityPostDto.getPassword(),
				savedCommunityPostDto.getPasswordHash());

		if (!passwordMatches) {
			return -1;
		}

		return communityDao.updatePost(communityPostDto);
	}

	// 게시글 삭제
	public int deletePost(Long id, String password) {

		CommunityPostDto savedCommunityPostDto = communityDao.selectPostById(id);

		if (savedCommunityPostDto == null) {
			return 0;
		}

		boolean passwordMatches = passwordEncoder.matches(password, savedCommunityPostDto.getPasswordHash());

		if (!passwordMatches) {
			return -1;
		}

		return communityDao.deletePost(id);
	}

	// 좋아요 증가
	public int increaseLikeCount(Long id) {

		return communityDao.increaseLikeCount(id);
	}

	// 댓글 등록
	public int insertComment(CommunityCommentDto communityCommentDto) {

		if (communityCommentDto.getPostId() == null) {
			throw new IllegalArgumentException("게시글 번호가 없습니다.");
		}

		if (communityCommentDto.getNickname() == null || communityCommentDto.getNickname().isBlank()) {
			throw new IllegalArgumentException("닉네임을 입력해주세요.");
		}

		if (communityCommentDto.getPassword() == null || communityCommentDto.getPassword().isBlank()) {
			throw new IllegalArgumentException("비밀번호를 입력해주세요.");
		}

		if (communityCommentDto.getContent() == null || communityCommentDto.getContent().isBlank()) {
			throw new IllegalArgumentException("댓글 내용을 입력해주세요.");
		}

		String passwordHash = passwordEncoder.encode(communityCommentDto.getPassword());

		communityCommentDto.setPasswordHash(passwordHash);

		if (communityCommentDto.getIsAdmin() == null) {
			communityCommentDto.setIsAdmin(false);
		}

		return communityDao.insertComment(communityCommentDto);
	}

	// 게시글별 댓글 목록 조회
	public List<CommunityCommentDto> selectCommentList(Long postId) {

		return communityDao.selectCommentList(postId);
	}

	// 댓글 수정
	public int updateComment(CommunityCommentDto communityCommentDto) {

		CommunityCommentDto savedComment = communityDao.selectCommentById(communityCommentDto.getId());

		if (savedComment == null) {
			return 0;
		}

		boolean passwordMatches = passwordEncoder.matches(communityCommentDto.getPassword(),
				savedComment.getPasswordHash());

		if (!passwordMatches) {
			return -1;
		}

		if (communityCommentDto.getContent() == null || communityCommentDto.getContent().isBlank()) {
			throw new IllegalArgumentException("댓글 내용을 입력해주세요.");
		}

		return communityDao.updateComment(communityCommentDto);
	}

	// 댓글 삭제
	public int deleteComment(Long id, String password) {

		CommunityCommentDto savedComment = communityDao.selectCommentById(id);

		if (savedComment == null) {
			return 0;
		}

		boolean passwordMatches = passwordEncoder.matches(password, savedComment.getPasswordHash());

		if (!passwordMatches) {
			return -1;
		}

		return communityDao.deleteComment(id);
	}
}
