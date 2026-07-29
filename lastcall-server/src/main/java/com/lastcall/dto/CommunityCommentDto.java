package com.lastcall.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

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

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
    @JsonIgnore
    private String passwordHash;

    private String content;

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private Boolean isAdmin;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
