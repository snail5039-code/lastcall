package com.lastcall.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.lastcall.dao.CommunityDao;
import com.lastcall.dto.CommunityCommentDto;
import com.lastcall.dto.CommunityPostDto;

import tools.jackson.databind.ObjectMapper;

class CommunityServiceSecurityTests {

	private final ObjectMapper objectMapper = new ObjectMapper();

	@Test
	void forcesUserSubmittedCommentToNonAdmin() {
		CommunityDao dao = mock(CommunityDao.class);
		when(dao.insertComment(any())).thenReturn(1);
		CommunityService service = new CommunityService(dao);
		CommunityCommentDto comment = new CommunityCommentDto();
		comment.setPostId(1L);
		comment.setNickname("작성자");
		comment.setPassword("long-enough-password");
		comment.setContent("일반 댓글");
		comment.setIsAdmin(true);

		assertThat(service.insertComment(comment)).isEqualTo(1);

		ArgumentCaptor<CommunityCommentDto> captor = ArgumentCaptor.forClass(CommunityCommentDto.class);
		verify(dao).insertComment(captor.capture());
		assertThat(captor.getValue().getIsAdmin()).isFalse();
		assertThat(captor.getValue().getPasswordHash()).startsWith("$2");
	}

	@Test
	void rejectsOversizedPageRequests() {
		CommunityService service = new CommunityService(mock(CommunityDao.class));

		assertThatThrownBy(() -> service.selectPostList("FREE", 0, 51))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void doesNotSerializePostPasswordsOrHashes() throws Exception {
		CommunityPostDto post = new CommunityPostDto();
		post.setPassword("plain-password");
		post.setPasswordHash("$2a$12$stored-hash");

		String json = objectMapper.writeValueAsString(post);

		assertThat(json).doesNotContain("plain-password", "stored-hash", "passwordHash", "\"password\"");
	}

	@Test
	void ignoresClientSuppliedAdminFlag() throws Exception {
		CommunityCommentDto comment = objectMapper.readValue(
				"{\"postId\":1,\"nickname\":\"user\",\"password\":\"secret\",\"content\":\"hello\",\"isAdmin\":true}",
				CommunityCommentDto.class);

		assertThat(comment.getIsAdmin()).isNull();
	}
}
