package dev.rawad.taxi.driver.entities.car;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity(name = "CarModel")
@Table(name = "car_models")
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(onlyExplicitlyIncluded = true)
@Getter
@Setter
@Builder
public class CarModelEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "carmodels_seq_gen")
    @SequenceGenerator(name = "carmodels_seq_gen", sequenceName = "carmodels_seq_gen", allocationSize = 1)
    @ToString.Include
    @EqualsAndHashCode.Include
    private Long id;

    private String name;
    private Integer releaseYear;
    private String engineType;
    private Integer motorPower;
    private Integer seats;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private CarManufacturerEntity manufacturer;

}