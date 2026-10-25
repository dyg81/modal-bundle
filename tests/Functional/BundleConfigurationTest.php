<?php

declare(strict_types=1);

namespace Dyg81\ModalBundle\Tests\Functional;

use Symfony\Component\Config\Definition\Exception\InvalidConfigurationException;

final class BundleConfigurationTest extends FunctionalTestCase
{
    public function testDefaultsAreExposedAsParameters(): void
    {
        self::bootKernel();
        $container = self::getContainer();

        self::assertSame('Dyg81ModalBundle', $container->getParameter('dyg81_modal.translation_domain'));
        self::assertSame('base-modal', $container->getParameter('dyg81_modal.default_modal_id'));
    }

    public function testCustomConfigurationIsApplied(): void
    {
        self::bootKernel(['dyg81_modal' => ['default_modal_id' => 'my-modal', 'translation_domain' => 'app']]);
        $container = self::getContainer();

        self::assertSame('my-modal', $container->getParameter('dyg81_modal.default_modal_id'));
        self::assertSame('app', $container->getParameter('dyg81_modal.translation_domain'));
    }

    public function testInvalidModalIdIsRejected(): void
    {
        $this->expectException(InvalidConfigurationException::class);

        self::bootKernel(['dyg81_modal' => ['default_modal_id' => '1 invalid']]);
    }
}
