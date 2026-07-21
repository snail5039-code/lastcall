package com.lastcall.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminSessionDto {
    private String token;
    private long expiresAt;
}
