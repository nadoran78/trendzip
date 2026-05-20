package com.mztrend.repository.command

import com.mztrend.domain.Generation
import com.mztrend.domain.Keyword
import org.springframework.data.jpa.repository.JpaRepository

interface KeywordRepository : JpaRepository<Keyword, Long> {
    fun findByGenerationOrderByCurrentRankAsc(generation: Generation): List<Keyword>
}
