package com.mztrend.repository.command

import com.mztrend.domain.ShortformReviewDecision
import org.springframework.data.jpa.repository.JpaRepository

interface ShortformReviewDecisionRepository : JpaRepository<ShortformReviewDecision, Long> {
    fun existsByRenderArtifactId(renderArtifactId: Long): Boolean
}
