package com.lastcall.dao;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import com.lastcall.dto.EmergencyDto;


@Mapper
public interface EmergencyDao {

	@Select("""
			select 
				hospitalName,
				address,
				phone,
				latitude,
				longitude
			from emergencyHospital
			""")
	List<EmergencyDto> getEmergencyList();
}
