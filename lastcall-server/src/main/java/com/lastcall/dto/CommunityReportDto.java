package com.lastcall.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CommunityReportDto {
    private Long id;
    private String targetType;
    private Long targetId;
    private String reason;
    private String status;
    private LocalDateTime createdAt;
    private String targetTitle;
    private String targetContent;
    private String targetNickname;
}
