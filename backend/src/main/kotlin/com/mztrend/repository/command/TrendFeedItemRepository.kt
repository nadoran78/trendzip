package com.mztrend.repository.command

import com.mztrend.domain.Generation
import com.mztrend.domain.TrendFeedItem
import org.springframework.data.jpa.repository.JpaRepository

interface TrendFeedItemRepository : JpaRepository<TrendFeedItem, Long> {
    fun findAllByGenerationAndIsActiveTrue(generation: Generation): List<TrendFeedItem>
}
