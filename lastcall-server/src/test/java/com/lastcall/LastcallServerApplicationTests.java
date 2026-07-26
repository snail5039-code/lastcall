package com.lastcall;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"DB_URL=jdbc:mysql://localhost:3306/lastcall_test",
		"DB_USERNAME=test",
		"DB_PASSWORD=test",
		"EMERGENCY_API_KEY=test-key"
})
class LastcallServerApplicationTests {

	@Test
	void contextLoads() {
	}

}
