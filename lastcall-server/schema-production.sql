CREATE TABLE IF NOT EXISTS emergencyHospital (
    hospitalName VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(30),
    latitude DOUBLE,
    longitude DOUBLE
);

CREATE TABLE IF NOT EXISTS communityPost (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    boardType VARCHAR(20) NOT NULL,
    nickname VARCHAR(30) NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    viewCount INT NOT NULL DEFAULT 0,
    likeCount INT NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_community_post_board_created (boardType, createdAt)
);

CREATE TABLE IF NOT EXISTS communityComment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    postId BIGINT NOT NULL,
    nickname VARCHAR(30) NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    isAdmin BOOLEAN NOT NULL DEFAULT FALSE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_community_comment_post_created (postId, createdAt),
    CONSTRAINT fk_community_comment_post
        FOREIGN KEY (postId) REFERENCES communityPost(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS communityReport (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    targetType VARCHAR(20) NOT NULL,
    targetId BIGINT NOT NULL,
    reason VARCHAR(300) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_community_report_status (status, createdAt)
);
