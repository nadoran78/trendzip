package com.mztrend.repository.command

import com.mztrend.domain.TrendFeed
import org.springframework.data.jpa.repository.JpaRepository

interface TrendFeedRepository : JpaRepository<TrendFeed, Long>
