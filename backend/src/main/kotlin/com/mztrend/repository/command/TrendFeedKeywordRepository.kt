package com.mztrend.repository.command

import com.mztrend.domain.TrendFeedKeyword
import org.springframework.data.jpa.repository.JpaRepository

interface TrendFeedKeywordRepository : JpaRepository<TrendFeedKeyword, Long>
