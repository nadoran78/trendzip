package com.mztrend.scheduler

import com.mztrend.common.logger
import com.mztrend.config.CrawlingSchedulerProperties
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component

@Component
class TrendCrawlingStartupRunner(
    private val trendCrawlingScheduler: TrendCrawlingScheduler,
    private val properties: CrawlingSchedulerProperties,
) : ApplicationRunner {
    override fun run(args: ApplicationArguments) {
        if (!properties.runOnStartup) {
            log.info("Skip startup trend crawling because run-on-startup is disabled.")
            return
        }

        log.info("Run startup trend crawling once.")
        trendCrawlingScheduler.crawlTrends()
    }

    companion object {
        private val log = logger<TrendCrawlingStartupRunner>()
    }
}
