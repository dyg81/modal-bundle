<?php

declare(strict_types=1);

namespace Dyg81\ModalBundle\Tests;

use Dyg81\ModalBundle\Dyg81ModalBundle;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Bundle\BundleInterface;

final class Dyg81ModalBundleTest extends TestCase
{
    public function testBundleCanBeInstantiated(): void
    {
        $bundle = new Dyg81ModalBundle();

        self::assertInstanceOf(BundleInterface::class, $bundle);
        self::assertSame('Dyg81\ModalBundle', $bundle->getNamespace());
    }
}