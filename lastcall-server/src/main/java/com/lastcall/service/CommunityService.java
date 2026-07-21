package com.lastcall.service;

import java.util.List;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.lastcall.dao.CommunityDao;
import com.lastcall.dto.CommunityCommentDto;
import com.lastcall.dto.CommunityPostDto;
import com.lastcall.dto.CommunityPostPageDto;
import com.lastcall.dto.CommunityReportDto;
import com.lastcall.dto.AdminSessionDto;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CommunityService {
	private static final List<String> PROHIBITED_WORDS = List.of(
			"시발", "씨발", "병신", "개새끼", "좆", "fuck", "sex");

	private final CommunityDao communityDao;
	private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
	private final Map<String, Long> adminSessions = new ConcurrentHashMap<>();
	private final Map<String, LoginAttempt> loginAttempts = new ConcurrentHashMap<>();
	private static final long ADMIN_SESSION_MILLIS = 8 * 60 * 60 * 1000L;
	private static final long LOGIN_LOCK_MILLIS = 10 * 60 * 1000L;

	@Value("${admin.password:}")
	private String adminPassword;
	@Value("${admin.username:admin}")
	private String adminUsername;

	// 게시글 등록
	public int insertPost(CommunityPostDto communityPostDto) {

		System.out.println("=== 게시글 등록 요청 ===");
		System.out.println("boardType: " + communityPostDto.getBoardType());
		System.out.println("nickname: " + communityPostDto.getNickname());
		System.out.println("title: " + communityPostDto.getTitle());

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
		validateCleanText(communityPostDto.getNickname(), communityPostDto.getTitle(), communityPostDto.getContent());

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
		validateCleanText(communityPostDto.getTitle(), communityPostDto.getContent());

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
		validateCleanText(communityCommentDto.getNickname(), communityCommentDto.getContent());

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
		validateCleanText(communityCommentDto.getContent());

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

	public int insertReport(CommunityReportDto reportDto) {
		if (reportDto.getTargetId() == null || !("POST".equals(reportDto.getTargetType()) || "COMMENT".equals(reportDto.getTargetType()))) {
			throw new IllegalArgumentException("신고 대상을 확인해주세요.");
		}
		if (reportDto.getReason() == null || reportDto.getReason().isBlank()) {
			throw new IllegalArgumentException("신고 사유를 입력해주세요.");
		}
		reportDto.setReason(reportDto.getReason().trim().substring(0, Math.min(300, reportDto.getReason().trim().length())));
		communityDao.ensureReportTable();
		return communityDao.insertReport(reportDto);
	}

	private void validateCleanText(String... values) {
		for (String value : values) {
			if (value == null) continue;
			String normalized = value.toLowerCase().replaceAll("[\\s._-]", "");
			if (PROHIBITED_WORDS.stream().anyMatch(normalized::contains)) {
				throw new IllegalArgumentException("금칙어가 포함되어 있습니다.");
			}
		}
	}

	public AdminSessionDto loginAdmin(String username, String password, String clientKey) {
		long now = System.currentTimeMillis();
		LoginAttempt attempt = loginAttempts.get(clientKey);
		if (attempt != null && attempt.failures() >= 5 && now < attempt.lockedUntil()) {
			throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해주세요.");
		}
		if (adminPassword == null || adminPassword.isBlank()) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "관리자 비밀번호가 설정되지 않았습니다.");
		}
		boolean usernameMatches = username != null && MessageDigest.isEqual(
				username.getBytes(StandardCharsets.UTF_8), adminUsername.getBytes(StandardCharsets.UTF_8));
		boolean matches = usernameMatches && password != null && MessageDigest.isEqual(
				password.getBytes(StandardCharsets.UTF_8), adminPassword.getBytes(StandardCharsets.UTF_8));
		if (!matches) {
			int failures = attempt == null || now - attempt.windowStartedAt() >= LOGIN_LOCK_MILLIS ? 1 : attempt.failures() + 1;
			long windowStartedAt = failures == 1 ? now : attempt.windowStartedAt();
			long lockedUntil = failures >= 5 ? now + LOGIN_LOCK_MILLIS : now;
			loginAttempts.put(clientKey, new LoginAttempt(failures, windowStartedAt, lockedUntil));
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "관리자 비밀번호가 올바르지 않습니다.");
		}
		loginAttempts.remove(clientKey);
		String token = UUID.randomUUID().toString() + UUID.randomUUID();
		long expiresAt = now + ADMIN_SESSION_MILLIS;
		adminSessions.put(token, expiresAt);
		return new AdminSessionDto(token, expiresAt);
	}

	public void requireAdmin(String authorization) {
		String token = authorization != null && authorization.startsWith("Bearer ") ? authorization.substring(7) : "";
		Long expiresAt = adminSessions.get(token);
		if (expiresAt == null || System.currentTimeMillis() >= expiresAt) {
			if (!token.isBlank()) adminSessions.remove(token);
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "관리자 로그인이 필요합니다.");
		}
	}

	public List<CommunityReportDto> selectAdminReports(String status) {
		communityDao.ensureReportTable();
		return communityDao.selectReports(status);
	}

	public int resolveAdminReport(Long id) {
		return communityDao.resolveReport(id);
	}

	public int deletePostAsAdmin(Long id) {
		return communityDao.adminDeletePost(id);
	}

	@Transactional
	public int deleteReportedContent(Long reportId) {
		CommunityReportDto report = communityDao.selectReportById(reportId);
		if (report == null) return 0;
		int deleted = "POST".equals(report.getTargetType())
				? communityDao.adminDeletePost(report.getTargetId())
				: communityDao.adminDeleteComment(report.getTargetId());
		communityDao.resolveReport(reportId);
		return deleted;
	}

	public void logoutAdmin(String authorization) {
		if (authorization != null && authorization.startsWith("Bearer ")) {
			adminSessions.remove(authorization.substring(7));
		}
	}

	private record LoginAttempt(int failures, long windowStartedAt, long lockedUntil) {}
}
