package com.mztrend.repository.command

import com.mztrend.domain.TrendExplain
import org.springframework.data.jpa.repository.JpaRepository

interface TrendExplainRepository : JpaRepository<TrendExplain, Long>
