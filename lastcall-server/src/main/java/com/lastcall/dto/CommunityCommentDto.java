package com.lastcall.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommunityCommentDto {

    private Long id;
    private Long postId;

    private String nickname;

    private String password;
    private String passwordHash;

    private String content;

    private Boolean isAdmin;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}