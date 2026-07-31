package com.mztrend.service

import com.mztrend.domain.Generation
import com.mztrend.domain.TrendCrawlRunStatus
import com.mztrend.repository.command.TrendCrawlRunRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull

@SpringBootTest
@ActiveProfiles("test")
class TrendCrawlRunRecorderTest {
    @Autowired
    private lateinit var trendCrawlRunRecorder: TrendCrawlRunRecorder

    @Autowired
    private lateinit var trendCrawlRunRepository: TrendCrawlRunRepository

    @Autowired
    private lateinit var transactionManager: PlatformTransactionManager

    @BeforeEach
    fun setUp() {
        trendCrawlRunRepository.deleteAllInBatch()
    }

    @Test
    fun `crawl run status changes are persisted`() {
        val completedRun = trendCrawlRunRecorder.start(Generation.TEEN)
        trendCrawlRunRecorder.complete(completedRun)

        val failedRun = trendCrawlRunRecorder.start(Generation.TWENTY)
        trendCrawlRunRecorder.fail(failedRun)

        val savedRuns = trendCrawlRunRepository.findAll().associateBy { it.generation }
        val savedCompletedRun = savedRuns.getValue(Generation.TEEN)
        val savedFailedRun = savedRuns.getValue(Generation.TWENTY)

        assertEquals(TrendCrawlRunStatus.COMPLETED, savedCompletedRun.status)
        assertNotNull(savedCompletedRun.completedAt)
        assertEquals(TrendCrawlRunStatus.FAILED, savedFailedRun.status)
        assertNotNull(savedFailedRun.completedAt)
    }

    @Test
    fun `crawl run start remains when surrounding transaction rolls back`() {
        assertFailsWith<IllegalStateException> {
            TransactionTemplate(transactionManager).executeWithoutResult {
                trendCrawlRunRecorder.start(Generation.TEEN)
                throw IllegalStateException("rollback outer transaction")
            }
        }

        val savedRun = trendCrawlRunRepository.findAll().single()
        assertEquals(Generation.TEEN, savedRun.generation)
        assertEquals(TrendCrawlRunStatus.RUNNING, savedRun.status)
    }
}
