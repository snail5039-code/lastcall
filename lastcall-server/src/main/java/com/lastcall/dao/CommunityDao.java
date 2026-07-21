package com.lastcall.dao;

import java.util.List;

import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import com.lastcall.dto.CommunityCommentDto;
import com.lastcall.dto.CommunityPostDto;
import com.lastcall.dto.CommunityReportDto;

@Mapper
public interface CommunityDao {

	// 게시글 등록
	@Insert("""
			    INSERT INTO communityPost (
			        boardType,
			        nickname,
			        passwordHash,
			        title,
			        content
			    )
			    VALUES (
			        #{boardType},
			        #{nickname},
			        #{passwordHash},
			        #{title},
			        #{content}
			    )
			""")
	@Options(useGeneratedKeys = true, keyProperty = "id")
	int insertPost(CommunityPostDto post);

	// 게시판 종류별 게시글 목록 조회
	@Select("""
			    SELECT
			        id,
			        boardType,
			        nickname,
			        title,
			        content,
			        viewCount,
			        createdAt,
			        updatedAt
			    FROM communityPost
			    WHERE boardType = #{boardType}
			    ORDER BY id DESC
			    LIMIT #{size}
			    OFFSET #{offset}
			""")
	List<CommunityPostDto> selectPostList(String boardType, int size, int offset);

	// 게시판 종류별 전체 게시글 수 조회
	@Select("""
			    SELECT COUNT(*)
			    FROM communityPost
			    WHERE boardType = #{boardType}
			""")
	long countPostList(String boardType);

	// 게시글 상세 조회
	@Select("""
			    SELECT
			        id,
			        boardType,
			        nickname,
			        passwordHash,
			        title,
			        content,
			        viewCount,
			        createdAt,
			        updatedAt
			    FROM communityPost
			    WHERE id = #{id}
			""")
	CommunityPostDto selectPostById(Long id);

	// 게시글 수정
	@Update("""
			    UPDATE communityPost
			    SET
			        title = #{title},
			        content = #{content}
			    WHERE id = #{id}
			""")
	int updatePost(CommunityPostDto post);

	// 게시글 삭제
	@Delete("""
			    DELETE FROM communityPost
			    WHERE id = #{id}
			""")
	int deletePost(Long id);

	// 조회수 증가
	@Update("""
			    UPDATE communityPost
			    SET viewCount = viewCount + 1
			    WHERE id = #{id}
			""")
	int increaseViewCount(Long id);

	// 좋아요 증가
	@Update("""
			    UPDATE communityPost
			    SET likeCount = likeCount + 1
			    WHERE id = #{id}
			""")
	int increaseLikeCount(Long id);

	// 댓글 등록
	@Insert("""
			    INSERT INTO communityComment (
			        postId,
			        nickname,
			        passwordHash,
			        content,
			        isAdmin
			    )
			    VALUES (
			        #{postId},
			        #{nickname},
			        #{passwordHash},
			        #{content},
			        #{isAdmin}
			    )
			""")
	@Options(useGeneratedKeys = true, keyProperty = "id")
	int insertComment(CommunityCommentDto comment);

	// 게시글별 댓글 목록 조회
	@Select("""
			    SELECT
			        id,
			        postId,
			        nickname,
			        content,
			        isAdmin,
			        createdAt,
			        updatedAt
			    FROM communityComment
			    WHERE postId = #{postId}
			    ORDER BY id ASC
			""")
	List<CommunityCommentDto> selectCommentList(Long postId);

	// 댓글 비밀번호 확인을 위한 단일 조회
	@Select("""
			    SELECT
			        id,
			        postId,
			        nickname,
			        passwordHash,
			        content,
			        isAdmin,
			        createdAt,
			        updatedAt
			    FROM communityComment
			    WHERE id = #{id}
			""")
	CommunityCommentDto selectCommentById(Long id);

	// 댓글 수정
	@Update("""
			    UPDATE communityComment
			    SET content = #{content}
			    WHERE id = #{id}
			""")
	int updateComment(CommunityCommentDto comment);

	// 댓글 삭제
	@Delete("""
			    DELETE FROM communityComment
			    WHERE id = #{id}
			""")
	int deleteComment(Long id);

	@Insert("""
			INSERT INTO communityReport (targetType, targetId, reason)
			VALUES (#{targetType}, #{targetId}, #{reason})
			""")
	@Options(useGeneratedKeys = true, keyProperty = "id")
	int insertReport(CommunityReportDto report);

	@Update("""
			CREATE TABLE IF NOT EXISTS communityReport (
			    id BIGINT AUTO_INCREMENT PRIMARY KEY,
			    targetType VARCHAR(20) NOT NULL,
			    targetId BIGINT NOT NULL,
			    reason VARCHAR(300) NOT NULL,
			    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
			    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			    INDEX idx_community_report_status (status, createdAt)
			)
			""")
	void ensureReportTable();

	@Select("""
			SELECT r.id, r.targetType, r.targetId, r.reason, r.status, r.createdAt,
			       CASE WHEN r.targetType = 'POST' THEN p.title ELSE CONCAT('댓글 #', r.targetId) END AS targetTitle,
			       CASE WHEN r.targetType = 'POST' THEN p.content ELSE c.content END AS targetContent,
			       CASE WHEN r.targetType = 'POST' THEN p.nickname ELSE c.nickname END AS targetNickname
			FROM communityReport r
			LEFT JOIN communityPost p ON r.targetType = 'POST' AND p.id = r.targetId
			LEFT JOIN communityComment c ON r.targetType = 'COMMENT' AND c.id = r.targetId
			WHERE (#{status} IS NULL OR #{status} = '' OR r.status = #{status})
			ORDER BY r.createdAt DESC
			""")
	List<CommunityReportDto> selectReports(String status);

	@Update("UPDATE communityReport SET status = 'RESOLVED' WHERE id = #{id}")
	int resolveReport(Long id);

	@Select("SELECT * FROM communityReport WHERE id = #{id}")
	CommunityReportDto selectReportById(Long id);

	@Delete("DELETE FROM communityPost WHERE id = #{id}")
	int adminDeletePost(Long id);

	@Delete("DELETE FROM communityComment WHERE id = #{id}")
	int adminDeleteComment(Long id);
}
