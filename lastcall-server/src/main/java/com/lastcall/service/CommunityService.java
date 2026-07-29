package com.lastcall.service;

import java.util.List;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.time.Duration;

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
	private static final int MAX_NICKNAME_LENGTH = 30;
	private static final int MAX_PASSWORD_LENGTH = 100;
	private static final int MAX_TITLE_LENGTH = 150;
	private static final int MAX_CONTENT_LENGTH = 5000;
	private static final int MAX_PAGE_SIZE = 50;

	private final CommunityDao communityDao;
	private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
	private final Map<String, Long> adminSessions = new ConcurrentHashMap<>();
	private final Map<String, LoginAttempt> loginAttempts = new ConcurrentHashMap<>();
	private static final long LOGIN_LOCK_MILLIS = 10 * 60 * 1000L;

	@Value("${admin.password-hash:}")
	private String adminPasswordHash;
	@Value("${admin.username:}")
	private String adminUsername;
	@Value("${admin.session-duration:1h}")
	private Duration adminSessionDuration;

	// 게시글 등록
	public int insertPost(CommunityPostDto communityPostDto) {

		String boardType = communityPostDto.getBoardType();

		if (!"FREE".equals(boardType) && !"SUGGESTION".equals(boardType) && !"QNA".equals(boardType)) {
			throw new IllegalArgumentException("등록할 수 없는 게시판 종류입니다.");
		}

		validateRequiredLength(communityPostDto.getNickname(), MAX_NICKNAME_LENGTH, "닉네임");
		validatePassword(communityPostDto.getPassword());
		validateRequiredLength(communityPostDto.getTitle(), MAX_TITLE_LENGTH, "제목");
		validateRequiredLength(communityPostDto.getContent(), MAX_CONTENT_LENGTH, "내용");
		validateCleanText(communityPostDto.getNickname(), communityPostDto.getTitle(), communityPostDto.getContent());

		String passwordHash = passwordEncoder.encode(communityPostDto.getPassword());

		communityPostDto.setPasswordHash(passwordHash);

		return communityDao.insertPost(communityPostDto);
	}

	// 게시판 종류별 목록 조회
	public CommunityPostPageDto selectPostList(String boardType, int page, int size) {
		if (!"FREE".equals(boardType) && !"SUGGESTION".equals(boardType) && !"QNA".equals(boardType)) {
			throw new IllegalArgumentException("조회할 수 없는 게시판 종류입니다.");
		}
		if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
			throw new IllegalArgumentException("페이지 범위를 확인해주세요.");
		}
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
		validatePassword(communityPostDto.getPassword());
		validateRequiredLength(communityPostDto.getTitle(), MAX_TITLE_LENGTH, "제목");
		validateRequiredLength(communityPostDto.getContent(), MAX_CONTENT_LENGTH, "내용");
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
		validatePassword(password);

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

		validateRequiredLength(communityCommentDto.getNickname(), MAX_NICKNAME_LENGTH, "닉네임");
		validatePassword(communityCommentDto.getPassword());
		validateRequiredLength(communityCommentDto.getContent(), MAX_CONTENT_LENGTH, "댓글");
		validateCleanText(communityCommentDto.getNickname(), communityCommentDto.getContent());

		String passwordHash = passwordEncoder.encode(communityCommentDto.getPassword());

		communityCommentDto.setPasswordHash(passwordHash);

		communityCommentDto.setIsAdmin(false);

		return communityDao.insertComment(communityCommentDto);
	}

	// 게시글별 댓글 목록 조회
	public List<CommunityCommentDto> selectCommentList(Long postId) {

		return communityDao.selectCommentList(postId);
	}

	// 댓글 수정
	public int updateComment(CommunityCommentDto communityCommentDto) {
		validatePassword(communityCommentDto.getPassword());
		validateRequiredLength(communityCommentDto.getContent(), MAX_CONTENT_LENGTH, "댓글");
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

		return communityDao.updateComment(communityCommentDto);
	}

	// 댓글 삭제
	public int deleteComment(Long id, String password) {
		validatePassword(password);

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

	private void validatePassword(String password) {
		validateRequiredLength(password, MAX_PASSWORD_LENGTH, "비밀번호");
	}

	private void validateRequiredLength(String value, int maxLength, String fieldName) {
		if (value == null || value.isBlank() || value.length() > maxLength) {
			throw new IllegalArgumentException(fieldName + " 값을 확인해주세요.");
		}
	}

	public AdminSessionDto loginAdmin(String username, String password, String clientKey) {
		long now = System.currentTimeMillis();
		if (loginAttempts.size() > 10_000) {
			loginAttempts.entrySet().removeIf(entry -> now - entry.getValue().windowStartedAt() >= LOGIN_LOCK_MILLIS);
		}
		if (adminSessions.size() > 10_000) {
			adminSessions.entrySet().removeIf(entry -> now >= entry.getValue());
		}
		LoginAttempt attempt = loginAttempts.get(clientKey);
		if (attempt != null && attempt.failures() >= 5 && now < attempt.lockedUntil()) {
			throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해주세요.");
		}
		if (!isAdminConfigurationValid()) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "관리자 인증이 설정되지 않았습니다.");
		}
		boolean usernameMatches = username != null && MessageDigest.isEqual(
				username.getBytes(StandardCharsets.UTF_8), adminUsername.getBytes(StandardCharsets.UTF_8));
		boolean passwordMatches = password != null && passwordEncoder.matches(password, adminPasswordHash);
		boolean matches = usernameMatches & passwordMatches;
		if (!matches) {
			int failures = attempt == null || now - attempt.windowStartedAt() >= LOGIN_LOCK_MILLIS ? 1 : attempt.failures() + 1;
			long windowStartedAt = failures == 1 ? now : attempt.windowStartedAt();
			long lockedUntil = failures >= 5 ? now + LOGIN_LOCK_MILLIS : now;
			loginAttempts.put(clientKey, new LoginAttempt(failures, windowStartedAt, lockedUntil));
			throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "관리자 비밀번호가 올바르지 않습니다.");
		}
		loginAttempts.remove(clientKey);
		String token = UUID.randomUUID().toString() + UUID.randomUUID();
		long expiresAt = now + adminSessionDuration.toMillis();
		adminSessions.put(token, expiresAt);
		return new AdminSessionDto(token, expiresAt);
	}

	private boolean isAdminConfigurationValid() {
		if (adminUsername == null || adminUsername.isBlank()
				|| adminPasswordHash == null
				|| !adminPasswordHash.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$")
				|| adminSessionDuration == null
				|| adminSessionDuration.isNegative()
				|| adminSessionDuration.isZero()
				|| adminSessionDuration.compareTo(Duration.ofHours(24)) > 0) {
			return false;
		}
		int bcryptCost = Integer.parseInt(adminPasswordHash.substring(4, 6));
		return bcryptCost >= 12;
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
