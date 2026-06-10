package com.mztrend.repository.command

import com.mztrend.domain.ExternalApiLog
import org.springframework.data.jpa.repository.JpaRepository

interface ExternalApiLogRepository : JpaRepository<ExternalApiLog, Long>
