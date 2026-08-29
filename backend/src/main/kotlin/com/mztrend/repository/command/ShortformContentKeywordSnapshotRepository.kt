package com.mztrend.repository.command

import com.mztrend.domain.ShortformContentKeywordSnapshot
import org.springframework.data.jpa.repository.JpaRepository

interface ShortformContentKeywordSnapshotRepository : JpaRepository<ShortformContentKeywordSnapshot, Long> {
    fun findAllByShortformContentIdOrderByDisplayOrderAsc(shortformContentId: Long): List<ShortformContentKeywordSnapshot>
}
