package com.mztrend.repository.command

import com.mztrend.domain.TrendLog
import org.springframework.data.jpa.repository.JpaRepository

interface TrendLogRepository : JpaRepository<TrendLog, Long>
