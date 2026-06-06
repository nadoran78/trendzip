package com.mztrend.scheduler

import com.mztrend.config.CrawlingSchedulerProperties
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.boot.DefaultApplicationArguments

class TrendCrawlingStartupRunnerTest {
    private val trendCrawlingScheduler = Mockito.mock(TrendCrawlingScheduler::class.java)

    @Test
    fun `run skips crawlTrends when run on startup is disabled`() {
        val runner = runner(runOnStartup = false)

        runner.run(DefaultApplicationArguments())

        Mockito.verifyNoInteractions(trendCrawlingScheduler)
    }

    @Test
    fun `run calls crawlTrends once when run on startup is enabled`() {
        val runner = runner(runOnStartup = true)

        runner.run(DefaultApplicationArguments())

        Mockito.verify(trendCrawlingScheduler).crawlTrends()
        Mockito.verifyNoMoreInteractions(trendCrawlingScheduler)
    }

    private fun runner(runOnStartup: Boolean): TrendCrawlingStartupRunner =
        TrendCrawlingStartupRunner(
            trendCrawlingScheduler = trendCrawlingScheduler,
            properties = CrawlingSchedulerProperties(runOnStartup = runOnStartup),
        )
}
