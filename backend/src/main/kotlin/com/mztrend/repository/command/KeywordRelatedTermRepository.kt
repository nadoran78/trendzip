package com.mztrend.repository.command

import com.mztrend.domain.KeywordRelatedTerm
import org.springframework.data.jpa.repository.JpaRepository

interface KeywordRelatedTermRepository : JpaRepository<KeywordRelatedTerm, Long>
