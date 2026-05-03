package com.mztrend

import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import kotlin.test.assertNotNull

@SpringBootTest
@ActiveProfiles("test")
class MzTrendApplicationTests {
    @Autowired
    private lateinit var dslContext: DSLContext

    @Test
    fun contextLoads() {
        assertNotNull(dslContext)
    }
}
